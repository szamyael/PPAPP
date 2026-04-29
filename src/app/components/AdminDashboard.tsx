import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Users, Building2, GraduationCap, DollarSign, CheckCircle, XCircle, Loader2, Bell, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

interface PendingStudent {
  id: string;
  full_name: string;
  email: string;
  program: string | null;
  student_id: string | null;
  year_level: string | null;
  department: string | null;
}

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  approval_status: string;
  created_at: string;
}

interface OrgRequest {
  id: string;
  org_name: string;
  contact_person: string;
  email: string;
  status: string;
}

interface Stats {
  totalStudents: number;
  totalTutors: number;
  totalOrgs: number;
  pendingStudents: number;
  pendingTutors: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [orgRequests, setOrgRequests]         = useState<OrgRequest[]>([]);
  const [stats, setStats]                     = useState<Stats | null>(null);
  const [loading, setLoading]                 = useState(true);
  
  // User Management state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ManagedUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
  }, [user, navigate]);

  // ── Load initial data ──────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    const [studentsRes, orgsRes, statsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, program, student_id, year_level, department")
        .eq("role", "student")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("org_requests")
        .select("id, org_name, contact_person, email, status")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("approval_status", "approved"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "tutor").eq("approval_status", "approved"),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("approval_status", "pending"),
        supabase.from("tutor_profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      ]),
    ]);

    setPendingStudents((studentsRes.data as PendingStudent[]) ?? []);
    setOrgRequests((orgsRes.data as OrgRequest[]) ?? []);
    const [s, t, o, ps, pt] = statsRes;
    setStats({
      totalStudents:  s.count ?? 0,
      totalTutors:    t.count ?? 0,
      totalOrgs:      o.count ?? 0,
      pendingStudents: ps.count ?? 0,
      pendingTutors:  pt.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchData();

    // ── Realtime: re-fetch when profiles change ──────────────────────
    const channel = supabase
      .channel("admin_approvals")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "org_requests" }, (payload) => {
        setOrgRequests((prev) => [...prev, payload.new as OrgRequest]);
        toast.info("New organization request received");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Action: approve / reject student ──────────────────────────────
  const handleStudentAction = async (studentId: string, name: string, action: "approved" | "rejected") => {
    const { error } = await supabase.rpc("approve_student", {
      p_student_id: studentId,
      p_status:     action,
    });
    if (error) {
      toast.error(`Failed to ${action} student: ${error.message}`);
      return;
    }
    toast.success(`${name} has been ${action}`);
    setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
    setStats((prev) => prev ? { ...prev, pendingStudents: prev.pendingStudents - 1 } : prev);
  };

  // ── Action: approve org request (creates org) ──────────────────────
  const handleOrgApprove = async (reqId: string, orgName: string) => {
    const { data: { supabase: client } = {} } = {} as any; // use imported client
    const { data, error } = await supabase.rpc("approve_org_request", {
      p_request_id: reqId,
      p_org_code:   `ORG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    });
    if (error) {
      toast.error(`Failed to approve org request: ${error.message}`);
      return;
    }
    toast.success(`Organization "${orgName}" created`);
    setOrgRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleOrgReject = async (reqId: string) => {
    const { error } = await supabase.rpc("reject_org_request", { p_request_id: reqId });
    if (error) { toast.error(error.message); return; }
    toast.success("Organization request rejected");
    setOrgRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, approval_status, created_at")
      .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(10);
    
    if (error) {
      toast.error("Search failed: " + error.message);
    } else {
      setSearchResults((data as ManagedUser[]) ?? []);
    }
    setSearching(false);
  };

  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Failed to send reset link: " + error.message);
    } else {
      toast.success("Password reset link sent to " + email);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "rejected" ? "approved" : "rejected";
    const { error } = await supabase
      .from("profiles")
      .update({ approval_status: newStatus })
      .eq("id", userId);
    
    if (error) {
      toast.error("Failed to update status: " + error.message);
    } else {
      toast.success(`User status updated to ${newStatus}`);
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, approval_status: newStatus } : u));
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">System overview and management</p>
          </div>
          {stats && (stats.pendingStudents + (stats.pendingTutors ?? 0)) > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {stats.pendingStudents + stats.pendingTutors} pending approvals
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <StatCard icon={<GraduationCap className="h-8 w-8 text-blue-600" />} label="Approved Students" value={String(stats?.totalStudents ?? 0)} />
              <StatCard icon={<Users className="h-8 w-8 text-purple-600" />} label="Approved Tutors" value={String(stats?.totalTutors ?? 0)} />
              <StatCard icon={<Building2 className="h-8 w-8 text-green-600" />} label="Organizations" value={String(stats?.totalOrgs ?? 0)} />
              <StatCard icon={<DollarSign className="h-8 w-8 text-orange-600" />} label="Pending Approvals" value={String((stats?.pendingStudents ?? 0) + (stats?.pendingTutors ?? 0))} />
            </div>

            {/* Pending Approvals Section */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Pending Student Approvals
                    {pendingStudents.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {pendingStudents.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Students waiting for account approval</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingStudents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No pending student approvals</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingStudents.map((s) => (
                        <StudentApprovalItem
                          key={s.id}
                          name={s.full_name}
                          email={s.email}
                          program={s.program ?? "—"}
                          studentId={s.student_id ?? "—"}
                          yearLevel={s.year_level ?? "—"}
                          department={s.department ?? "—"}
                          onApprove={() => handleStudentAction(s.id, s.full_name, "approved")}
                          onReject={() => handleStudentAction(s.id, s.full_name, "rejected")}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Organization Requests
                    {orgRequests.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {orgRequests.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>New organization account requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {orgRequests.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No pending organization requests</p>
                  ) : (
                    <div className="space-y-4">
                      {orgRequests.map((req) => (
                        <OrgRequestItem
                          key={req.id}
                          name={req.org_name}
                          contactPerson={req.contact_person}
                          email={req.email}
                          onApprove={() => handleOrgApprove(req.id, req.org_name)}
                          onReject={() => handleOrgReject(req.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Management Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User Management & Actions
                </CardTitle>
                <CardDescription>Search all users to send reset links or manage account status</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearchUsers} className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search Users"}
                  </Button>
                </form>

                {searchResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role / Status</th>
                          <th className="px-4 py-3">Created At</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {searchResults.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-medium text-gray-900">{u.full_name}</p>
                              <p className="text-gray-500 text-xs">{u.email}</p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit capitalize">
                                  {u.role}
                                </Badge>
                                <Badge 
                                  variant={u.approval_status === "approved" ? "default" : "destructive"} 
                                  className={`w-fit text-[10px] py-0 px-1.5 ${u.approval_status === "approved" ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                                >
                                  {u.approval_status}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-500 text-xs">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleResetPassword(u.email)}
                                >
                                  <Bell className="h-3 w-3" /> Reset Pwd
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={u.approval_status === "approved" ? "destructive" : "default"}
                                  className="h-8 text-xs gap-1"
                                  onClick={() => handleToggleBan(u.id, u.approval_status)}
                                >
                                  {u.approval_status === "approved" ? (
                                    <><XCircle className="h-3 w-3" /> Ban</>
                                  ) : (
                                    <><CheckCircle className="h-3 w-3" /> Unban</>
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : searchQuery && !searching ? (
                  <p className="text-center text-gray-500 py-8 text-sm italic">No users found matching "{searchQuery}"</p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentApprovalItem({
  name, email, program, studentId, yearLevel, department, onApprove, onReject,
}: {
  name: string; email: string; program: string; studentId: string;
  yearLevel: string; department: string; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-200 transition-colors shadow-sm">
      <div className="mb-3">
        <p className="font-semibold text-lg text-gray-900">{name}</p>
        <p className="text-sm text-gray-600 font-medium">{email}</p>
      </div>
      <div className="grid grid-cols-2 gap-y-2 mb-4 bg-gray-50 p-3 rounded-md">
        <p className="text-xs text-gray-500"><strong>Department:</strong> <span className="text-gray-700">{department}</span></p>
        <p className="text-xs text-gray-500"><strong>Program:</strong> <span className="text-gray-700">{program}</span></p>
        <p className="text-xs text-gray-500"><strong>Student ID:</strong> <span className="text-gray-700">{studentId}</span></p>
        <p className="text-xs text-gray-500"><strong>Year Level:</strong> <span className="text-gray-700">{yearLevel}</span></p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} className="flex-1">
          <CheckCircle className="h-4 w-4 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} className="flex-1">
          <XCircle className="h-4 w-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}

function OrgRequestItem({
  name, contactPerson, email, onApprove, onReject,
}: {
  name: string; contactPerson: string; email: string; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <p className="font-semibold text-lg">{name}</p>
        <p className="text-sm text-gray-600">{email}</p>
      </div>
      <p className="text-sm mb-4"><strong>Contact:</strong> {contactPerson}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} className="flex-1">
          <Building2 className="h-4 w-4 mr-1" /> Approve & Create
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} className="flex-1">
          <XCircle className="h-4 w-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}
