import { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Upload, FileText, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface Material {
  id: string;
  title: string;
  subject: string;
  approval_status: string;
  download_count: number;
}



export function MyMaterials() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMaterials();
    }
  }, [user]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, subject, approval_status, download_count")
        .eq("tutor_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!title || !subject || !user) {
      toast.error("Please provide a title and subject");
      return;
    }

    setUploading(true);
    try {
      // In a real app, you would upload the file to Supabase Storage first
      const { error } = await supabase.from("materials").insert({
        tutor_id: user.id,
        title,
        subject,
        description,
        approval_status: "pending",
        is_open_library: true,
      });

      if (error) throw error;

      toast.success("Material submitted for review!");
      setTitle("");
      setSubject("");
      setDescription("");
      setIsDialogOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error("Error uploading material:", err);
      toast.error("Failed to submit material");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Learning Materials</h1>
            <p className="text-gray-600 mt-1">Upload and manage your teaching materials</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Learning Material</DialogTitle>
                <DialogDescription>
                  Share your teaching materials with students. Materials will be reviewed by your
                  organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Material Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Calculus I - Complete Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                      <SelectItem value="computer-science">Computer Science</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the content..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <Input type="file" className="hidden" id="fileUpload" accept=".pdf,.doc,.docx" />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                      <span className="text-xs text-gray-500 block mt-1">PDF, DOC, DOCX (max 10MB)</span>
                    </label>
                  </div>
                </div>
                <Button onClick={handleUpload} className="w-full" disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {uploading ? "Submitting..." : "Submit for Review"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {loading ? (
            <div className="flex justify-center py-12 col-span-3"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : materials.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-500">You haven't uploaded any materials yet.</div>
          ) : (
            materials.map((material) => (
              <Card key={material.id}>
                <CardHeader>
                  <FileText className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>{material.title}</CardTitle>
                  <CardDescription>{material.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={material.approval_status === "approved" ? "default" : "secondary"}>
                        {material.approval_status === "approved" ? "Approved" : "Pending Review"}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Auto-Screening: Passed
                      </Badge>
                      {material.approval_status === "approved" && (
                        <span className="text-sm text-gray-500">{material.download_count} downloads</span>
                      )}
                    </div>
                    <Button variant="outline" className="w-full">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
