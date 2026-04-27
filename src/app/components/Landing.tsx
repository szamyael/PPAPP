import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { GraduationCap, Users, BookOpen, MessageSquare, Award, Globe } from "lucide-react";
import { Button } from "./ui/button";

export function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate(`/dashboard/${user.role}`);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Piyupair</span>
            </div>
            <div className="flex gap-4">
              {!user ? (
                <>
                  <Button variant="outline" onClick={() => navigate("/login")}>
                    Login
                  </Button>
                  <Button onClick={() => navigate("/register")}>
                    Get Started
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate(`/dashboard/${user.role}`)}>
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6">
                Connect, Learn, and Excel with Piyupair
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                A comprehensive tutoring platform connecting students with qualified tutors
                and organizations. Learn better, teach smarter.
              </p>
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={handleGetStarted}
              >
                Get Started Today
              </Button>
            </div>
            <div className="relative h-96 rounded-lg overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1520569495996-b5e1219cb625?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMHN0dWR5aW5nJTIwdG9nZXRoZXJ8ZW58MXx8fHwxNzc2MzE2NTg3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Students studying together"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            Everything You Need to Succeed
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Users className="h-12 w-12 text-blue-600" />}
              title="Find Qualified Tutors"
              description="Connect with vetted tutors screened by trusted organizations. Book sessions and track your progress."
            />
            <FeatureCard
              icon={<BookOpen className="h-12 w-12 text-purple-600" />}
              title="Access Learning Materials"
              description="Browse the open library with materials shared by organizations. Upload and manage your own content."
            />
            <FeatureCard
              icon={<MessageSquare className="h-12 w-12 text-green-600" />}
              title="Collaborate & Communicate"
              description="Join study groups, chat with peers and tutors, and participate in an active community newsfeed."
            />
            <FeatureCard
              icon={<Award className="h-12 w-12 text-orange-600" />}
              title="Rate & Review"
              description="Share your experience with star ratings. Get extra recognition when grades improve with proof."
            />
            <FeatureCard
              icon={<GraduationCap className="h-12 w-12 text-red-600" />}
              title="Virtual Classroom"
              description="Google Classroom-like features for posting activities, submitting work, and taking quizzes."
            />
            <FeatureCard
              icon={<Globe className="h-12 w-12 text-teal-600" />}
              title="Multi-Organization Network"
              description="Organizations manage tutors, screen credentials, and build libraries of approved materials."
            />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Account</h3>
              <p className="text-gray-600">
                Sign up as a student, tutor, or organization. Each role has tailored features
                for your needs.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Verified</h3>
              <p className="text-gray-600">
                Tutors are screened by organizations. Students are approved by admins. Quality
                is our priority.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Learning</h3>
              <p className="text-gray-600">
                Book sessions, access materials, join study groups, and track your academic
                journey.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 text-purple-100">
            Join thousands of students, tutors, and organizations already using Piyupair.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100"
              onClick={() => navigate("/register")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8" />
            <span className="ml-2 text-2xl font-bold">Piyupair</span>
          </div>
          <p className="text-gray-400">
            © 2026 Piyupair. Empowering education through connection.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
