import { useEffect, useState, useRef } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export function Messages() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
      const channel = subscribeToMessages(selectedChatId);
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isTutor = user.role === "tutor";
      const profileFkeyName = isTutor ? "bookings_student_profile_fkey" : "bookings_tutor_profile_fkey";
      const matchField = isTutor ? "tutor_id" : "student_id";

      // Fetch bookings as potential chats
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          subject,
          other_party:profiles!${profileFkeyName} (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq(matchField, user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: Chat[] = (data || []).map((b: any) => ({
        id: b.id,
        name: b.other_party?.full_name || "Unknown",
        avatar: b.other_party?.avatar_url || (b.other_party?.full_name || "?").slice(0, 2).toUpperCase(),
        lastMessage: `Session for ${b.subject}`,
        time: "",
      }));

      // Remove duplicates if any (e.g. multiple bookings with same person)
      const uniqueChats = mapped.filter((chat, index, self) =>
        index === self.findIndex((t) => t.id === chat.id)
      );

      setChats(uniqueChats);
      if (uniqueChats.length > 0 && !selectedChatId) {
        setSelectedChatId(uniqueChats[0].id);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const subscribeToMessages = (chatId: string) => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return channel;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedChatId || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase.from("chat_messages").insert({
        chat_id: selectedChatId,
        sender_id: user.id,
        sender_name: user.name || "User",
        content: messageContent,
      });

      if (error) {
        setNewMessage(messageContent); // Restore on error
        throw error;
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    }
  };

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Connect with your tutors and students</p>
        </div>

        <Card className="h-[650px] flex overflow-hidden border-none shadow-xl rounded-2xl bg-white/80 backdrop-blur-sm">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-100 flex flex-col bg-white">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Input placeholder="Search messages..." className="pl-10 bg-gray-50 border-none rounded-xl" />
                <MessageSquare className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : chats.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-gray-500 text-sm">No conversations found.</p>
                  <p className="text-gray-400 text-xs mt-1">Messages appear after booking a session.</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-all ${
                      selectedChatId === chat.id ? "bg-blue-50/50 border-r-4 border-blue-600" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedChatId(chat.id)}
                  >
                    <Avatar className="h-12 w-12 bg-blue-600 text-white flex items-center justify-center rounded-full shadow-sm">
                      {chat.avatar.length <= 2 ? chat.avatar : <img src={chat.avatar} alt={chat.name} className="rounded-full h-full w-full object-cover" />}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold truncate text-gray-900">{chat.name}</p>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{chat.time}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50/30">
            {selectedChatId ? (
              <>
                <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                    {selectedChat?.avatar.length! <= 2 ? selectedChat?.avatar : <img src={selectedChat?.avatar} alt={selectedChat?.name} className="rounded-full h-full w-full object-cover" />}
                  </Avatar>
                  <div>
                    <h2 className="font-bold text-gray-900">{selectedChat?.name}</h2>
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      Online
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                  {loadingMessages ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-gray-300" />
                      </div>
                      <p>Start a conversation with {selectedChat?.name}</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                            message.sender_id === user?.id
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-white text-gray-900 rounded-bl-none"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p
                            className={`text-[10px] mt-2 font-medium ${
                              message.sender_id === user?.id ? "text-blue-200" : "text-gray-400"
                            }`}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                  <form className="flex gap-2" onSubmit={handleSendMessage}>
                    <Input
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-gray-50 border-none rounded-xl focus-visible:ring-blue-500 h-12 px-4"
                    />
                    <Button type="submit" className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
                      <Send className="h-5 w-5" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center">
                <div className="h-24 w-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                  <MessageSquare className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your Conversations</h3>
                <p className="max-w-xs">Select a contact from the sidebar to start messaging your tutors or students.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
