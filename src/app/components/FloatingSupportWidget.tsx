import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  createdAt: number;
};

// Common questions that don't need API calls (cached responses)
const QUICK_ANSWERS: Record<string, string> = {
  "how do i book a session": "Go to 'Find Tutors', select a tutor, and choose a date/time that works for you. Click 'Book Session' to confirm.",
  "how do i join a video call": "When a session starts, you'll see a 'Join Video Call' button on the session card. Click it to connect.",
  "how do i rate a tutor": "After a session completes, go to 'My Sessions', find the past session, and click 'Rate Session'.",
  "what's my organization code": "Check your organization dashboard for your unique organization code to share with tutors.",
  "why can't i login": "Try clearing your browser cache, disabling extensions, or using an incognito window. If issues persist, file a ticket.",
  "how do i reset my password": "Use the 'Forgot Password' link on the login page. If you don't receive an email, file a support ticket.",
  "how do i upload materials": "Tutors can upload materials via the 'Learning Materials' section on their dashboard.",
  "how do i find a tutor": "Go to your Dashboard, click 'Find a Tutor', and use filters to search by subject, rating, or availability.",
  "what's the newsfeed": "The newsfeed is a community board where you can share questions, announcements, events, and learning materials.",
  "can i cancel a session": "Yes, you can cancel pending sessions from 'My Sessions'. Contact the other party if needed.",
  "app is loading slowly": "Try refreshing the page, clearing your cache, or checking your internet connection.",
  "can't see real-time updates": "Refresh the page to sync data. If issues continue, check your internet connection.",
};

const endpointBase = supabaseFunctionsBaseUrl;

function useStableId() {
  return useMemo(() => crypto.randomUUID(), []);
}

export function FloatingSupportWidget() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "tutorial" | "info" | "ticket">("chat");
  const [apiCallCount, setApiCallCount] = useState(0);

  const initialId = useStableId();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: initialId,
      role: "bot",
      content: "Hi! 👋 Ask a question, check tutorials, system info, or file a ticket. I can answer ~5 questions per session to save resources.",
      createdAt: Date.now(),
    },
  ]);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || activeTab !== "chat") return;
    const handle = window.setTimeout(() => {
      scrollRef.current?.scrollIntoView({ block: "end" });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [open, activeTab, messages.length]);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
    }),
    [],
  );

  // Check if a question matches a cached quick answer
  const getQuickAnswer = (input: string): string | null => {
    const normalized = input.toLowerCase().trim();
    for (const [key, value] of Object.entries(QUICK_ANSWERS)) {
      if (normalized.includes(key) || key.includes(normalized.split(" ")[0])) {
        return value;
      }
    }
    return null;
  };

  const sendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Check API call limit
      if (apiCallCount >= 5) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "bot",
            content: "You’ve reached your chat limit for this session. For more help, please file a ticket with details of your issue.",
            createdAt: Date.now(),
          },
        ]);
        setChatLoading(false);
        return;
      }

      // Check for quick answer first (no API call)
      const quickAnswer = getQuickAnswer(trimmed);
      if (quickAnswer) {
        const botMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "bot",
          content: quickAnswer,
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setChatLoading(false);
        return;
      }

      // Use API for custom questions
      const response = await fetch(`${endpointBase}/support/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: trimmed, path: window.location.pathname }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data?.error || "Chat request failed");

      setApiCallCount((prev) => prev + 1);

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        content: data.reply || "Thanks — can you share a bit more detail?",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Warn if approaching limit
      if (apiCallCount + 1 >= 4) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "bot",
            content: `⚠️ You have ${5 - (apiCallCount + 1)} question(s) left. For complex issues, please file a ticket.`,
            createdAt: Date.now(),
          },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          content: "Sorry — I couldn’t reach support services. Try filing a ticket instead, and we’ll help you out.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const fileTicket = async () => {
    if (ticketLoading) return;

    const subject = ticketSubject.trim();
    const message = ticketMessage.trim();
    const email = ticketEmail.trim();

    if (!subject || !message) {
      toast.error("Please add a subject and message.");
      return;
    }

    setTicketLoading(true);

    try {
      const response = await fetch(`${endpointBase}/support/ticket`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email || undefined,
          subject,
          message,
          path: window.location.pathname,
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(data?.error || "Ticket submission failed");

      toast.success(`Ticket filed${data.id ? `: ${data.id}` : ""}`);
      setTicketSubject("");
      setTicketMessage("");
      setTicketEmail("");
      setActiveTab("chat");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          content: "Got it — your ticket was filed for the developers.",
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ticket submission failed";
      toast.error(message);
    } finally {
      setTicketLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            className="h-12 w-12 rounded-full p-0"
            aria-label="Open support chat"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0">
          <SheetHeader>
            <SheetTitle>Support</SheetTitle>
            <SheetDescription>
              Chat with the bot or file a ticket.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="chat">
                  Chat
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="tutorial">
                  Guide
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="info">
                  Info
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="ticket">
                  Ticket
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4 space-y-3">
                {/* Quick choice buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setChatInput("How do I book a session?"); }} className="text-xs p-2 border rounded hover:bg-gray-50">📅 Book Session</button>
                  <button onClick={() => { setChatInput("How do I join a video call?"); }} className="text-xs p-2 border rounded hover:bg-gray-50">🎥 Join Call</button>
                  <button onClick={() => { setChatInput("Why can't I login?"); }} className="text-xs p-2 border rounded hover:bg-gray-50">🔐 Login Issue</button>
                  <button onClick={() => { setChatInput("How do I rate a tutor?"); }} className="text-xs p-2 border rounded hover:bg-gray-50">⭐ Rate Tutor</button>
                </div>

                <ScrollArea className="h-80 rounded-md border border-gray-200 bg-white p-3">
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            m.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="mt-3 flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a question..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                  />
                  <Button
                    onClick={() => void sendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="tutorial" className="mt-4">
                <ScrollArea className="h-96 rounded-md border border-gray-200 bg-white p-3">
                  <div className="space-y-3 text-sm">
                    <div>
                      <h3 className="font-semibold mb-2">👤 For Students</h3>
                      <ol className="list-decimal ml-4 space-y-1 text-xs">
                        <li>Sign up with email</li>
                        <li>Wait for admin approval</li>
                        <li>Go to Dashboard</li>
                        <li>Click "Find a Tutor"</li>
                        <li>Select tutor & book session</li>
                        <li>Join video call when ready</li>
                      </ol>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">🎓 For Tutors</h3>
                      <ol className="list-decimal ml-4 space-y-1 text-xs">
                        <li>Sign up with organization code</li>
                        <li>Wait for approval</li>
                        <li>Upload credentials</li>
                        <li>Set availability</li>
                        <li>Accept bookings</li>
                        <li>Conduct sessions</li>
                      </ol>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="info" className="mt-4">
                <ScrollArea className="h-96 rounded-md border border-gray-200 bg-white p-3">
                  <div className="space-y-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="font-semibold">💾 Database</p>
                      <p>Supabase PostgreSQL with real-time updates</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="font-semibold">🔒 Security</p>
                      <p>All data encrypted & access-controlled</p>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <p className="font-semibold">🎯 Features</p>
                      <p>Video sessions, materials library, study groups, ratings</p>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <p className="font-semibold">⚡ Limits</p>
                      <p>~5 chat questions/session to save API costs</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <p className="font-semibold">📞 Need Help?</p>
                      <p className="mt-1">Use Chat for quick answers, or File a Ticket for bugs/issues</p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ticket" className="mt-4">
                <ScrollArea className="h-96 rounded-md border border-gray-200 bg-white p-3">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticketEmail">Email (optional)</Label>
                      <Input
                        id="ticketEmail"
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                        placeholder="name@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticketSubject">Subject</Label>
                      <Input
                        id="ticketSubject"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="What’s going on?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticketMessage">Message</Label>
                      <Textarea
                        id="ticketMessage"
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="Describe the concern in detail..."
                      />
                    </div>
                  </div>
                </ScrollArea>

                <Button
                  className="w-full mt-3"
                  onClick={() => void fileTicket()}
                  disabled={ticketLoading}
                >
                  {ticketLoading ? "Submitting..." : "Submit Ticket"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
