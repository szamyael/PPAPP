import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Upload, FileText, CheckCircle, Clock, Plus, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { 
  useClassroomActivities, 
  useClassroomSubmissions, 
  useClassroomSubscription 
} from "../lib/hooks";

type ClassroomActivity = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  submissions: number;
  totalStudents: number;
};

export function Classroom() {
  const navigate = useNavigate();
  const { classroomId } = useParams();
  const { user } = useAuth();
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Use React Query hooks
  const { data: activitiesData, isLoading: activitiesLoading } = useClassroomActivities(classroomId);
  const { data: submissionCounts, isLoading: submissionsLoading } = useClassroomSubmissions(classroomId);

  // Set up real-time subscription
  useEffect(() => {
    const subscription = useClassroomSubscription(classroomId);
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [classroomId]);

  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionFileName, setSubmissionFileName] = useState<string | null>(null);
  const [submittedActivityIds, setSubmittedActivityIds] = useState<Record<string, true>>({});

  const isTutor = user?.role === "tutor";
  const isStudent = user?.role === "student";

  // Merge activities with submission counts
  const activities: ClassroomActivity[] = useMemo(() => {
    if (!activitiesData) return [];
    
    return activitiesData.map(activity => ({
      ...activity,
      submissions: submissionCounts?.[activity.id] ?? 0,
    }));
  }, [activitiesData, submissionCounts]);

  const submittedCount = useMemo(() => Object.keys(submittedActivityIds).length, [submittedActivityIds]);

  const isLoading = activitiesLoading || submissionsLoading;

  const handlePostActivity = async () => {
    if (!activityTitle || !activityDescription || !dueDate) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("classroom_activities")
        .insert({
          classroom_id: classroomId ?? "1",
          title: activityTitle,
          description: activityDescription,
          due_date: dueDate,
          status: "pending",
          total_students: 18,
        });

      if (error) throw error;

      toast.success("Activity posted successfully!");
      setActivityTitle("");
      setActivityDescription("");
      setDueDate("");
    } catch (err) {
      toast.error("Unable to post activity right now");
    }
  };

  const handleSubmitWork = async (activityId: string) => {
    if (!submissionFileName) {
      toast.error("Please attach a file before submitting");
      return;
    }

    try {
      const { error } = await supabase
        .from("classroom_submissions")
        .insert({
          classroom_id: classroomId ?? "1",
          activity_id: activityId,
          file_name: submissionFileName,
          note: submissionNote || null,
        });

      if (error) throw error;

      toast.success("Submission uploaded successfully!");
      setSubmittedActivityIds((prev) => ({ ...prev, [activityId]: true }));
      setSubmissionNote("");
      setSubmissionFileName(null);
    } catch (err) {
      toast.error("Unable to upload submission right now");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Classroom</h1>
          </div>
          <div className="flex justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mathematics Classroom</h1>
            <p className="text-gray-600 mt-1">Dr. Michael Johnson • 18 Students</p>
          </div>
          <div className="flex items-center gap-3">
            {isTutor && classroomId && (
              <Button variant="outline" onClick={() => navigate(`/classroom/${classroomId}/call`)}>
                <Video className="h-4 w-4 mr-2" />
                Classroom Call
              </Button>
            )}
            {isTutor && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Activity
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post New Activity</DialogTitle>
                    <DialogDescription>
                      Create an assignment or quiz for your students
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="activityTitle">Activity Title</Label>
                      <Input
                        id="activityTitle"
                        placeholder="e.g., Problem Set 1"
                        value={activityTitle}
                        onChange={(e) => setActivityTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activityDescription">Description</Label>
                      <Textarea
                        id="activityDescription"
                        placeholder="Instructions for students..."
                        value={activityDescription}
                        onChange={(e) => setActivityDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Attach Files (Optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <Input type="file" className="hidden" id="activityFile" multiple />
                        <label htmlFor="activityFile" className="cursor-pointer">
                          <span className="text-sm text-blue-600 hover:underline">Upload files</span>
                        </label>
                      </div>
                    </div>
                    <Button onClick={handlePostActivity} className="w-full">
                      Post Activity
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Tabs defaultValue="activities">
          <TabsList>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="activities" className="mt-6">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No activities posted yet.
                  </CardContent>
                </Card>
              ) : (
                activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{activity.title}</CardTitle>
                          <CardDescription className="mt-2">{activity.description}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {activity.dueDate}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          {activity.submissions}/{activity.totalStudents} submitted
                        </div>
                        {isTutor && (
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        )}

                        {isStudent && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={Boolean(submittedActivityIds[activity.id])}>
                                {submittedActivityIds[activity.id] ? "Submitted" : "Submit Work"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Submit Work</DialogTitle>
                                <DialogDescription>
                                  Upload your output for: {activity.title}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="space-y-2">
                                  <Label htmlFor="submissionNote">Notes (Optional)</Label>
                                  <Textarea
                                    id="submissionNote"
                                    rows={3}
                                    placeholder="Add context for your tutor (optional)"
                                    value={submissionNote}
                                    onChange={(e) => setSubmissionNote(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Upload File</Label>
                                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                    <Input
                                      type="file"
                                      className="hidden"
                                      id={`submissionFile-${activity.id}`}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        setSubmissionFileName(file ? file.name : null);
                                      }}
                                    />
                                    <label htmlFor={`submissionFile-${activity.id}`} className="cursor-pointer">
                                      <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                                      <span className="text-xs text-gray-500 block mt-1">PDF, DOCX, PNG, JPG</span>
                                    </label>
                                    {submissionFileName && (
                                      <p className="text-xs text-gray-600 mt-2">Selected: {submissionFileName}</p>
                                    )}
                                  </div>
                                </div>
                                <Button className="w-full" onClick={() => handleSubmitWork(activity.id)}>
                                  Submit
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-6">
            <Card>
              <CardContent className="py-10">
                {isStudent && (
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      You have submitted {submittedCount} activity{submittedCount === 1 ? "" : "ies"}.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Submit work from the Activities tab.</p>
                  </div>
                )}

                {isTutor && (
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select an activity to view submissions</p>
                  </div>
                )}

                {!isTutor && !isStudent && (
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Sign in as a student or tutor to use submissions.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="mt-6">
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No materials uploaded yet</p>
                <Button className="mt-4">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Material
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}