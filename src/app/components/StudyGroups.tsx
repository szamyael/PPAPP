import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Users, Plus, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { useStudyGroups, useStudyGroupsSubscription } from "../lib/hooks";

export function StudyGroups() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupSubject, setGroupSubject] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const { data: groups, isLoading, error } = useStudyGroups();

  // Set up real-time subscription for new groups
  useEffect(() => {
    const subscription = useStudyGroupsSubscription();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const handleCreateGroup = async () => {
    if (!groupName || !groupSubject || !groupDescription) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("study_groups")
        .insert({
          name: groupName,
          subject: groupSubject,
          description: groupDescription,
          admin_name: "You",
          member_count: 1,
        });

      if (error) throw error;

      toast.success("Study group created successfully!");
      setGroupName("");
      setGroupSubject("");
      setGroupDescription("");
    } catch (err) {
      toast.error("Unable to create study group right now");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Study Groups</h1>
              <p className="text-gray-600 mt-1">Join or create study groups with your peers</p>
            </div>
          </div>
          <div className="flex justify-center py-24">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Study Groups</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600">Error loading study groups. Please try again later.</p>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold text-gray-900">Study Groups</h1>
            <p className="text-gray-600 mt-1">Join or create study groups with your peers</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
                <DialogDescription>
                  Form a new study group and invite other students to join
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Calculus 101"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupSubject">Subject</Label>
                  <Input
                    id="groupSubject"
                    placeholder="e.g., Mathematics"
                    value={groupSubject}
                    onChange={(e) => setGroupSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Description</Label>
                  <Textarea
                    id="groupDescription"
                    placeholder="What will this group focus on?"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search study groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Groups */}
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No study groups found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{group.name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {group.subject}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{group.members}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                  <p className="text-xs text-gray-500 mb-4">Admin: {group.admin}</p>
                  <Button className="w-full" onClick={() => navigate(`/study-groups/${group.id}`)}>
                    Join Group
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}