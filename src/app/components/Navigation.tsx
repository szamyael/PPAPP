import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ProfileModal } from "./ProfileModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  GraduationCap,
  Home,
  MessageSquare,
  Users,
  BookOpen,
  Calendar,
  FileText,
  PenTool,
  Search,
  User,
  LogOut,
  Flag,
} from "lucide-react";

export function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? `/dashboard/${user.role}` : "/"} className="flex items-center">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">Piyupair</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              to="/newsfeed"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
            >
              <Home className="h-5 w-5" />
              <span className="hidden sm:inline">Newsfeed</span>
            </Link>
            <Link
              to="/messages"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="hidden sm:inline">Messages</span>
            </Link>
            {user?.role === "student" && (
              <>
                <Link
                  to="/find-tutors"
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                >
                  <Search className="h-5 w-5" />
                  <span className="hidden sm:inline">Find Tutors</span>
                </Link>
                <Link
                  to="/study-groups"
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
                >
                  <Users className="h-5 w-5" />
                  <span className="hidden sm:inline">Study Groups</span>
                </Link>
              </>
            )}
            <Link
              to="/library"
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600"
            >
              <BookOpen className="h-5 w-5" />
              <span className="hidden sm:inline">Library</span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback className="bg-blue-50 text-blue-600">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/dashboard/${user?.role}`)}>
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                {(user?.role === "student" || user?.role === "tutor") && (
                  <DropdownMenuItem onClick={() => navigate("/classroom/1")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Classroom
                  </DropdownMenuItem>
                )}
                {user?.role === "student" && (
                  <DropdownMenuItem onClick={() => navigate("/sessions")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    My Sessions
                  </DropdownMenuItem>
                )}
                {user?.role === "tutor" && (
                  <DropdownMenuItem onClick={() => navigate("/sessions")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    My Sessions
                  </DropdownMenuItem>
                )}
                {(user?.role === "tutor" || user?.role === "organization") && (
                  <DropdownMenuItem onClick={() => navigate("/materials")}>
                    <FileText className="mr-2 h-4 w-4" />
                    My Materials
                  </DropdownMenuItem>
                )}
                {user?.role === "tutor" && (
                  <DropdownMenuItem onClick={() => navigate("/quiz-maker")}>
                    <PenTool className="mr-2 h-4 w-4" />
                    Quiz Maker
                  </DropdownMenuItem>
                )}
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/dashboard/admin/moderation")}>
                    <Flag className="mr-2 h-4 w-4 text-red-500" />
                    Moderation
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </nav>
  );
}
