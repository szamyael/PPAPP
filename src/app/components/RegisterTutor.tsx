import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { GraduationCap, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { uploadCredential } from "../lib/storage";

export function RegisterTutor() {
  const navigate = useNavigate();
  const { register, loginError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name:             "",
    email:            "",
    password:         "",
    organizationCode: "",
    subjects:         "",
    experience:       "",
    education:        "",
  });
  const [credentials, setCredentials] = useState<File[]>([]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setCredentials(Array.from(e.target.files));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (codeSent && !verificationCode) {
      toast.error("Please enter the verification code to continue.");
      return;
    }

    setLoading(true);

    // 1. Validate org code first (gives immediate feedback)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("unique_code", formData.organizationCode.toUpperCase().trim())
      .maybeSingle();

    if (orgError || !org) {
      toast.error("Invalid organization code. Contact your organization for the correct code.");
      setLoading(false);
      return;
    }

    // 2. Register auth account + profile
    const success = await register({
      ...formData,
      role: "tutor",
      organizationCode: formData.organizationCode,
    });

    if (!success) {
      toast.error(loginError ?? "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    // 3. Upload credential files to storage
    //    We need the new user's ID — fetch it from the just-created auth account
    if (credentials.length > 0) {
      setUploadingFiles(true);
      try {
        // Get the newly created user's ID via passwordless lookup
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", formData.email)
          .maybeSingle();

        if (profileData?.id) {
          const urls: string[] = [];
          for (const file of credentials) {
            const { path } = await uploadCredential(file, profileData.id);
            urls.push(path);
          }
          // Store paths on tutor_profiles (service-side upsert safe without auth)
          await supabase
            .from("tutor_profiles")
            .update({ credentials_urls: urls })
            .eq("user_id", profileData.id);
        }
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
        toast.error(`Credentials uploaded with errors: ${msg}`);
      } finally {
        setUploadingFiles(false);
      }
    }

    toast.success(
      "Application submitted! Your organization will review your credentials. " +
      "You'll be notified once approved."
    );
    navigate("/login");
    setLoading(false);
  };

  const handleSendCode = async () => {
    if (!formData.email) {
      toast.error("Please enter an email address first.");
      return;
    }
    setSendingCode(true);
    
    const { error } = await supabase.auth.signInWithOtp({ 
      email: formData.email,
      options: { shouldCreateUser: false } 
    });

    setSendingCode(false);
    
    if (error && error.message !== "Signups not allowed for otp") {
      toast.error(`Verification error: ${error.message}`);
    } else {
      setCodeSent(true);
      toast.success("Verification code sent to your email!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Tutor Application</CardTitle>
          <CardDescription>
            Create your tutor account. You'll need a unique code from an organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You must request a unique code from an organization before
              registering. Contact organizations directly to obtain their code.
            </p>
          </div>

          <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Your application will be reviewed by your organization before you can sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Jane Smith" value={formData.name} onChange={set("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex gap-2">
                  <Input id="email" type="email" placeholder="jane@email.com" value={formData.email} onChange={set("email")} required />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleSendCode} 
                    disabled={!formData.email || sendingCode}
                    className="shrink-0"
                  >
                    {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Code"}
                  </Button>
                </div>
              </div>
              
              {codeSent && (
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input 
                    id="verificationCode" 
                    placeholder="Enter 6-digit code" 
                    value={verificationCode} 
                    onChange={(e) => setVerificationCode(e.target.value)} 
                    required 
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={set("password")} required minLength={8} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationCode">Organization Unique Code</Label>
              <Input
                id="organizationCode"
                placeholder="ORG-XXXXX"
                value={formData.organizationCode}
                onChange={set("organizationCode")}
                required
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjects">Subjects You Can Teach</Label>
              <Input id="subjects" placeholder="Mathematics, Physics, Chemistry" value={formData.subjects} onChange={set("subjects")} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Educational Background</Label>
              <Textarea
                id="education"
                placeholder="Bachelor of Science in Mathematics, University XYZ (2022)"
                value={formData.education}
                onChange={set("education")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Teaching Experience</Label>
              <Textarea
                id="experience"
                placeholder="3 years of private tutoring, 1 year as teaching assistant…"
                value={formData.experience}
                onChange={set("experience")}
                required
              />
            </div>

            {/* Credential file upload */}
            <div className="space-y-2">
              <Label>Upload Credentials</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {credentials.length > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">{credentials.length} file(s) selected</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                    <span className="text-xs text-gray-500 block mt-1">
                      Grades, Certificates, Training Documents (PDF, JPG, PNG)
                    </span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="credentials"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || uploadingFiles}
            >
              {loading || uploadingFiles ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingFiles ? "Uploading credentials…" : "Submitting application…"}
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
            <Link to="/" className="text-sm text-gray-500 hover:underline mt-2 inline-block">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
