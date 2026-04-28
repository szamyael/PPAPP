import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { RegisterWizard } from "./components/RegisterWizard";
import { StudentDashboard } from "./components/StudentDashboard";
import { TutorDashboard } from "./components/TutorDashboard";
import { OrganizationDashboard } from "./components/OrganizationDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ModerationPanel } from "./components/ModerationPanel";
import { Newsfeed } from "./components/Newsfeed";
import { Messages } from "./components/Messages";
import { StudyGroups } from "./components/StudyGroups";
import { OpenLibrary } from "./components/OpenLibrary";
import { FindTutors } from "./components/FindTutors";
import { FindPeople } from "./components/FindPeople";
import { BookingForm } from "./components/BookingForm";
import { Payment } from "./components/Payment";
import { MySessions } from "./components/MySessions";
import { MyMaterials } from "./components/MyMaterials";
import { QuizMaker } from "./components/QuizMaker";
import { Classroom } from "./components/Classroom";
import { VideoCall } from "./components/VideoCall";
import { ClassroomCall } from "./components/ClassroomCall";
import { RateSession } from "./components/RateSession";
import { StudyGroupDetail } from "./components/StudyGroupDetail";
import { ProfileView } from "./components/ProfileView";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Landing },
      { path: "login", Component: Login },
      { path: "register", Component: RegisterWizard },
      { path: "dashboard/student", Component: StudentDashboard },
      { path: "dashboard/tutor", Component: TutorDashboard },
      { path: "dashboard/organization", Component: OrganizationDashboard },
      { path: "dashboard/admin", Component: AdminDashboard },
      { path: "dashboard/admin/moderation", Component: ModerationPanel },
      { path: "newsfeed", Component: Newsfeed },
      { path: "messages", Component: Messages },
      { path: "study-groups", Component: StudyGroups },
      { path: "library", Component: OpenLibrary },
      { path: "find-tutors", Component: FindTutors },
      { path: "find-people", Component: FindPeople },
      { path: "profile/:userId", Component: ProfileView },
      { path: "book/:tutorId", Component: BookingForm },
      { path: "payment", Component: Payment },
      { path: "sessions", Component: MySessions },
      { path: "sessions/:sessionId/call", Component: VideoCall },
      { path: "rate/:sessionId", Component: RateSession },
      { path: "materials", Component: MyMaterials },
      { path: "quiz-maker", Component: QuizMaker },
      { path: "classroom/:classroomId", Component: Classroom },
      { path: "classroom/:classroomId/call", Component: ClassroomCall },
      { path: "study-groups/:groupId", Component: StudyGroupDetail },
      { path: "*", Component: NotFound },
    ],
  },
]);
