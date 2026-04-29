import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { GraduationCap, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function Login() {
  const navigate = useNavigate();
  const { login, loginError, verifyOtp, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const role = await login(formData.email, formData.password);
    
    if (role) {
      setSubmitting(false);
      navigate(`/dashboard/${role}`, { replace: true });
    } else {
      // Check if error is due to unconfirmed email
      if (loginError?.toLowerCase().includes("confirm") || loginError?.toLowerCase().includes("verify")) {
        setNeedsVerification(true);
        toast.info("Your email is not verified yet. Please enter the verification code sent to your email.");
      } else {
        toast.error(loginError ?? "Invalid email or password.");
      }
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      toast.error("Please enter the verification code.");
      return;
    }

    setSubmitting(true);
    const success = await verifyOtp(formData.email, verificationCode);
    setSubmitting(false);

    if (success) {
      toast.success("Email verified! Your account is now pending admin/org approval.");
      setNeedsVerification(false);
      setVerificationCode("");
    } else {
      toast.error(loginError ?? "Invalid verification code.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Sign In to Piyupair</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show approval / rejection / verification message */}
          {loginError && !needsVerification && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">{loginError}</p>
            </div>
          )}

          {needsVerification ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Verification code sent to <strong>{formData.email}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full text-gray-500 text-xs"
                onClick={() => setNeedsVerification(false)}
              >
                Back to Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={set("email")}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={set("password")}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Don't have an account yet?
            </p>
            <Button
              variant="outline"
              className="w-full border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700"
              onClick={() => navigate("/register")}
            >
              Register Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}