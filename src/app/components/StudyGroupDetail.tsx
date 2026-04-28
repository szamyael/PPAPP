import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

type StudyGroup = {
  id: string;
  name: string;
  subject: string;
  members: number;
  description: string;
  admin: string;
};

type StudyGroupMessage = {
  id: string;
  sender: string;
  initials: string;
  time: string;
  text: string;
};

type StudyGroupFile = {
  id: string;
  name: string;
  sharedBy: string;
  time: string;
};

type DbStudyGroup = {
  id: string;
  name: string;
  subject: string;
  member_count: number;
  description: string;
  admin_name: string;
};

type DbGroupMessage = {
  id: string;
  group_id: string;
  sender_name: string;
  sender_initials: string;
  message_text: string;
  created_at: string;
};

type DbGroupFile = {
  id: string;
  group_id: string;
  file_name: string;
  shared_by: string;
  created_at: string;
};

function toClockTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toRelativeDay(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const diffDays = Math.floor((Date.now() - created) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function toInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapDbGroup(row: DbStudyGroup): StudyGroup {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    members: row.member_count,
    description: row.description,
    admin: row.admin_name,
  };
}

function mapDbMessage(row: DbGroupMessage): StudyGroupMessage {
  return {
    id: row.id,
    sender: row.sender_name,
    initials: row.sender_initials,
    time: toClockTime(row.created_at),
    text: row.message_text,
  };
}

function mapDbFile(row: DbGroupFile): StudyGroupFile {
  return {
    id: row.id,
    name: row.file_name,
    sharedBy: row.shared_by,
    time: toRelativeDay(row.created_at),
  };
}



export function StudyGroupDetail() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [dbGroup, setDbGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<StudyGroupMessage[]>([]);
  const [files, setFiles] = useState<StudyGroupFile[]>([]);
  const [members, setMembers] = useState<{ name: string; initials: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const group = dbGroup;

  const [newMessage, setNewMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    let isMounted = true;

    void supabase
      .from("study_groups")
      .select("id, name, subject, member_count, description, admin_name")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !isMounted || !data) return;

        setDbGroup(mapDbGroup(data as DbStudyGroup));
      });

    void supabase
      .from("study_group_messages")
      .select("id, group_id, sender_name, sender_initials, message_text, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error || !isMounted || !data) return;
        if (data.length > 0) {
          setMessages(data.map((row) => mapDbMessage(row as DbGroupMessage)));
        }
      });

    void supabase
      .from("study_group_files")
      .select("id, group_id, file_name, shared_by, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error || !isMounted || !data) return;
        setFiles(data.map((row) => mapDbFile(row as DbGroupFile)));
      });

    void supabase
      .from("study_group_members")
      .select("role, profiles(full_name)")
      .eq("group_id", groupId)
      .then(({ data, error }) => {
        if (error || !isMounted || !data) return;
        setMembers(
          (data as any[]).map((m) => ({
            name: m.profiles?.full_name || "Unknown",
            initials: toInitials(m.profiles?.full_name || "Unknown"),
            role: m.role.charAt(0).toUpperCase() + m.role.slice(1),
          }))
        );
        setLoading(false);
      });

    const channel = supabase
      .channel(`study-group-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_group_messages" }, ({ new: row }) => {
        const mapped = row as DbGroupMessage;
        if (mapped.group_id !== groupId) return;

        const next = mapDbMessage(mapped);
        setMessages((current) => (current.some((item) => item.id === next.id) ? current : [...current, next]));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_group_files" }, ({ new: row }) => {
        const mapped = row as DbGroupFile;
        if (mapped.group_id !== groupId) return;

        const next = mapDbFile(mapped);
        setFiles((current) => (current.some((item) => item.id === next.id) ? current : [next, ...current]));
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [groupId]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    if (!groupId || !dbGroup) {
      const localMessage: StudyGroupMessage = {
        id: crypto.randomUUID(),
        sender: "You",
        initials: "YU",
        time: toClockTime(new Date().toISOString()),
        text: newMessage.trim(),
      };
      setMessages((current) => [...current, localMessage]);
      toast.success("Message sent");
      setNewMessage("");
      return;
    }

    void supabase
      .from("study_group_messages")
      .insert({
        group_id: groupId,
        sender_name: "You",
        sender_initials: toInitials("You"),
        message_text: newMessage.trim(),
      })
      .then(({ error }) => {
        if (error) {
          toast.error("Unable to send message right now");
          return;
        }

        toast.success("Message sent");
        setNewMessage("");
      });
  };

  const uploadFile = () => {
    if (!selectedFileName) return;

    if (!groupId || !dbGroup) {
      const localFile: StudyGroupFile = {
        id: crypto.randomUUID(),
        name: selectedFileName,
        sharedBy: "You",
        time: "Today",
      };
      setFiles((current) => [localFile, ...current]);
      toast.success("File shared with group");
      setSelectedFileName(null);
      return;
    }

    void supabase
      .from("study_group_files")
      .insert({
        group_id: groupId,
        file_name: selectedFileName,
        shared_by: "You",
      })
      .then(({ error }) => {
        if (error) {
          toast.error("Unable to share file right now");
          return;
        }

        toast.success("File shared with group");
        setSelectedFileName(null);
      });
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Study Group</CardTitle>
              <CardDescription>Group not found.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/study-groups")}>Back to Study Groups</Button>
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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-gray-600 mt-1">Admin: {group.admin}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="secondary">{group.subject}</Badge>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="h-4 w-4" />
                <span className="text-sm">{group.members} members</span>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/study-groups")}>
            Back
          </Button>
        </div>

        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <Card className="h-[520px] flex flex-col">
              <CardHeader>
                <CardTitle>Group Chat</CardTitle>
                <CardDescription>{group.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                      {m.initials}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{m.sender}</p>
                        <p className="text-xs text-gray-500">{m.time}</p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{m.text}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <Button onClick={sendMessage}>Send</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shared Files</CardTitle>
                  <CardDescription>Files shared by group members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-gray-500">Shared by {f.sharedBy} • {f.time}</p>
                      </div>
                      <Button variant="outline" size="sm">Download</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Share a File</CardTitle>
                  <CardDescription>Upload notes, problem sets, or helpful links</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <Input
                      type="file"
                      className="hidden"
                      id="groupFile"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSelectedFileName(file ? file.name : null);
                      }}
                    />
                    <label htmlFor="groupFile" className="cursor-pointer">
                      <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                      <span className="text-xs text-gray-500 block mt-1">PDF, DOCX, PNG, JPG</span>
                    </label>
                    {selectedFileName && (
                      <p className="text-xs text-gray-600 mt-2">Selected: {selectedFileName}</p>
                    )}
                  </div>
                  <Button className="w-full" onClick={uploadFile} disabled={!selectedFileName}>
                    Share File
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>People in this study group</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {members.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 col-span-2">No members found.</p>
                ) : (
                  members.map((m) => (
                    <div key={m.name} className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
                      <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                        {m.initials}
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.role}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
