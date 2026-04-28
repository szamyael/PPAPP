import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";

// Lazy load all route components to delay their initialization until providers are ready
const Landing = lazy(() => import("./components/Landing").then(m => ({ default: m.Landing })));
const Login = lazy(() => import("./components/Login").then(m => ({ default: m.Login })));
const RegisterWizard = lazy(() => import("./components/RegisterWizard").then(m => ({ default: m.RegisterWizard })));
const StudentDashboard = lazy(() => import("./components/StudentDashboard").then(m => ({ default: m.StudentDashboard })));
const TutorDashboard = lazy(() => import("./components/TutorDashboard").then(m => ({ default: m.TutorDashboard })));
const OrganizationDashboard = lazy(() => import("./components/OrganizationDashboard").then(m => ({ default: m.OrganizationDashboard })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const ModerationPanel = lazy(() => import("./components/ModerationPanel").then(m => ({ default: m.ModerationPanel })));
const Newsfeed = lazy(() => import("./components/Newsfeed").then(m => ({ default: m.Newsfeed })));
const Messages = lazy(() => import("./components/Messages").then(m => ({ default: m.Messages })));
const StudyGroups = lazy(() => import("./components/StudyGroups").then(m => ({ default: m.StudyGroups })));
const OpenLibrary = lazy(() => import("./components/OpenLibrary").then(m => ({ default: m.OpenLibrary })));
const FindTutors = lazy(() => import("./components/FindTutors").then(m => ({ default: m.FindTutors })));
const FindPeople = lazy(() => import("./components/FindPeople").then(m => ({ default: m.FindPeople })));
const BookingForm = lazy(() => import("./components/BookingForm").then(m => ({ default: m.BookingForm })));
const Payment = lazy(() => import("./components/Payment").then(m => ({ default: m.Payment })));
const MySessions = lazy(() => import("./components/MySessions").then(m => ({ default: m.MySessions })));
const MyMaterials = lazy(() => import("./components/MyMaterials").then(m => ({ default: m.MyMaterials })));
const QuizMaker = lazy(() => import("./components/QuizMaker").then(m => ({ default: m.QuizMaker })));
const Classroom = lazy(() => import("./components/Classroom").then(m => ({ default: m.Classroom })));
const VideoCall = lazy(() => import("./components/VideoCall").then(m => ({ default: m.VideoCall })));
const ClassroomCall = lazy(() => import("./components/ClassroomCall").then(m => ({ default: m.ClassroomCall })));
const RateSession = lazy(() => import("./components/RateSession").then(m => ({ default: m.RateSession })));
const StudyGroupDetail = lazy(() => import("./components/StudyGroupDetail").then(m => ({ default: m.StudyGroupDetail })));
const ProfileView = lazy(() => import("./components/ProfileView").then(m => ({ default: m.ProfileView })));
const NotFound = lazy(() => import("./components/NotFound").then(m => ({ default: m.NotFound })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: () => <Suspense fallback={<LoadingFallback />}><Landing /></Suspense> },
      { path: "login", Component: () => <Suspense fallback={<LoadingFallback />}><Login /></Suspense> },
      { path: "register", Component: () => <Suspense fallback={<LoadingFallback />}><RegisterWizard /></Suspense> },
      { path: "dashboard/student", Component: () => <Suspense fallback={<LoadingFallback />}><StudentDashboard /></Suspense> },
      { path: "dashboard/tutor", Component: () => <Suspense fallback={<LoadingFallback />}><TutorDashboard /></Suspense> },
      { path: "dashboard/organization", Component: () => <Suspense fallback={<LoadingFallback />}><OrganizationDashboard /></Suspense> },
      { path: "dashboard/admin", Component: () => <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense> },
      { path: "dashboard/admin/moderation", Component: () => <Suspense fallback={<LoadingFallback />}><ModerationPanel /></Suspense> },
      { path: "newsfeed", Component: () => <Suspense fallback={<LoadingFallback />}><Newsfeed /></Suspense> },
      { path: "messages", Component: () => <Suspense fallback={<LoadingFallback />}><Messages /></Suspense> },
      { path: "study-groups", Component: () => <Suspense fallback={<LoadingFallback />}><StudyGroups /></Suspense> },
      { path: "library", Component: () => <Suspense fallback={<LoadingFallback />}><OpenLibrary /></Suspense> },
      { path: "find-tutors", Component: () => <Suspense fallback={<LoadingFallback />}><FindTutors /></Suspense> },
      { path: "find-people", Component: () => <Suspense fallback={<LoadingFallback />}><FindPeople /></Suspense> },
      { path: "profile/:userId", Component: () => <Suspense fallback={<LoadingFallback />}><ProfileView /></Suspense> },
      { path: "book/:tutorId", Component: () => <Suspense fallback={<LoadingFallback />}><BookingForm /></Suspense> },
      { path: "payment", Component: () => <Suspense fallback={<LoadingFallback />}><Payment /></Suspense> },
      { path: "sessions", Component: () => <Suspense fallback={<LoadingFallback />}><MySessions /></Suspense> },
      { path: "sessions/:sessionId/call", Component: () => <Suspense fallback={<LoadingFallback />}><VideoCall /></Suspense> },
      { path: "rate/:sessionId", Component: () => <Suspense fallback={<LoadingFallback />}><RateSession /></Suspense> },
      { path: "materials", Component: () => <Suspense fallback={<LoadingFallback />}><MyMaterials /></Suspense> },
      { path: "quiz-maker", Component: () => <Suspense fallback={<LoadingFallback />}><QuizMaker /></Suspense> },
      { path: "classroom/:classroomId", Component: () => <Suspense fallback={<LoadingFallback />}><Classroom /></Suspense> },
      { path: "classroom/:classroomId/call", Component: () => <Suspense fallback={<LoadingFallback />}><ClassroomCall /></Suspense> },
      { path: "study-groups/:groupId", Component: () => <Suspense fallback={<LoadingFallback />}><StudyGroupDetail /></Suspense> },
      { path: "*", Component: () => <Suspense fallback={<LoadingFallback />}><NotFound /></Suspense> },
    ],
  },
]);
