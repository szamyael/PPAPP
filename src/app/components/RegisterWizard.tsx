import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import {
  GraduationCap, Building2, BookOpen, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, Upload, AlertCircle, User, Mail, Lock, Send,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { uploadCredential } from "../lib/storage";

// ─── Department → Program data ────────────────────────────────────────────────
const DEPARTMENTS: Record<string, string[]> = {
  "College of Arts and Sciences (CAS)": [
    "Bachelor of Arts in Broadcasting",
    "Bachelor of Science in Biology",
    "Bachelor of Science in Chemistry",
    "Bachelor of Science in Mathematics",
    "Bachelor of Science in Psychology",
  ],
  "College of Business Administration and Accountancy (CBAA)": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Entrepreneurship",
    "Bachelor of Science in Office Administration",
    "Master of Public Administration (MPA)",
  ],
  "College of Computer Studies (CCS)": [
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Computer Science",
    "Master in Information Technology (MSIT)",
  ],
  "College of Criminal Justice Education (CCJE)": [
    "Bachelor of Science in Criminology",
  ],
  "College of Engineering (COE)": [
    "Bachelor of Science in Civil Engineering",
    "Bachelor of Science in Mechanical Engineering",
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
    "Bachelor of Science in Computer Engineering",
  ],
  "College of Industrial Technology (CIT)": [
    "Bachelor of Science in Industrial Technology",
  ],
  "College of Hospitality and Tourism Management (CHMT)": [
    "Bachelor of Science in Hospitality Management",
    "Bachelor of Science in Tourism Management",
  ],
  "College of Law (CL)": [
    "Juris Doctor",
  ],
  "College of Nursing and Allied Health (CONAH)": [
    "Bachelor of Science in Nursing",
  ],
  "College of Teacher Education (CTE)": [
    "Bachelor of Elementary Education (BEEd)",
    "Bachelor of Secondary Education (BSEd)",
    "Bachelor of Physical Education (BPEd)",
    "Bachelor of Technology and Livelihood Education (BTLEd)",
    "Bachelor of Technical Vocational Teacher Education (BTVTEd)",
    "Master of Arts in Education (MAEd)",
    "Master of Arts in Teaching English (MAT-ENG)",
    "Doctor of Education (Ed.D.)",
  ],
};

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV", "V"];

// ─── Step definitions per role ─────────────────────────────────────────────────
type AccountType = "student" | "tutor" | "organization" | "";

// ─── Component ────────────────────────────────────────────────────────────────
export function RegisterWizard() {
  const navigate = useNavigate();
  const { register, loginError } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]               = useState(1);
  const [accountType, setAccountType] = useState<AccountType>("");
  const [loading, setLoading]         = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent]       = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [credentials, setCredentials] = useState<File[]>([]);

  // ── Form fields ──────────────────────────────────────────────────────────────
  const [firstName,        setFirstName]        = useState("");
  const [middleName,       setMiddleName]        = useState("");
  const [lastName,         setLastName]         = useState("");
  const [suffix,           setSuffix]           = useState("");
  const [email,            setEmail]            = useState("");
  const [password,         setPassword]         = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // Student-specific
  const [studentId,  setStudentId]  = useState("");
  const [yearLevel,  setYearLevel]  = useState("");
  const [department, setDepartment] = useState("");
  const [program,    setProgram]    = useState("");

  // Tutor-specific
  const [orgCode,     setOrgCode]     = useState("");
  const [subjects,    setSubjects]    = useState("");
  const [education,   setEducation]   = useState("");
  const [experience,  setExperience]  = useState("");

  // Organization-specific
  const [orgName,   setOrgName]   = useState("");
  const [orgMessage, setOrgMessage] = useState("");

  // ── Derived values ───────────────────────────────────────────────────────────
  const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
  const totalSteps = accountType === "organization" ? 2
                   : accountType === "tutor"        ? 4
                   : 4; // student

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    setProgram("");
  };

  const handleSendCode = async () => {
    if (!email) { toast.error("Please enter your email address first."); return; }
    setSendingCode(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setSendingCode(false);
    if (error && error.message !== "Signups not allowed for otp") {
      toast.error(`Failed to send code: ${error.message}`);
    } else {
      setCodeSent(true);
      toast.success("Verification code sent! Check your email.");
    }
  };

  // ── Final submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (codeSent && !verificationCode) { toast.error("Please enter the verification code."); return; }

    setLoading(true);

    if (accountType === "organization") {
      const success = await register({
        name:     orgName,
        orgName,
        email,
        password: "placeholder",
        message:  orgMessage,
        role:     "organization_request" as any,
      });
      setLoading(false);
      if (success) { setSubmitted(true); }
      else { toast.error(loginError ?? "Submission failed. Please try again."); }
      return;
    }

    if (accountType === "tutor") {
      // Validate org code
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("unique_code", orgCode.toUpperCase().trim())
        .maybeSingle();

      if (orgError || !org) {
        toast.error("Invalid organization code. Contact your organization for the correct code.");
        setLoading(false);
        return;
      }
    }

    const success = await register({
      name:             fullName,
      firstName,
      middleName,
      lastName,
      suffix,
      email,
      password,
      role:             accountType as "student" | "tutor",
      studentId:        accountType === "student" ? studentId      : undefined,
      yearLevel:        accountType === "student" ? yearLevel      : undefined,
      department:       accountType === "student" ? department     : undefined,
      program:          accountType === "student" ? program        : undefined,
      organizationCode: accountType === "tutor"   ? orgCode        : undefined,
      subjects:         accountType === "tutor"   ? subjects       : undefined,
      education:        accountType === "tutor"   ? education      : undefined,
      experience:       accountType === "tutor"   ? experience     : undefined,
    });

    // Upload tutor credentials after successful auth
    if (success && accountType === "tutor" && credentials.length > 0) {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("email", email).maybeSingle();
      if (profile?.id) {
        const urls: string[] = [];
        for (const file of credentials) {
          const { path } = await uploadCredential(file, profile.id);
          urls.push(path);
        }
        await supabase
          .from("tutor_profiles")
          .update({ credentials_urls: urls })
          .eq("user_id", profile.id);
      }
    }

    setLoading(false);

    if (success) {
      const msg = accountType === "student"
        ? "Registration submitted! Your account is pending admin approval."
        : "Application submitted! Your organization will review your credentials.";
      toast.success(msg);
      navigate("/login");
    } else {
      toast.error(loginError ?? "Registration failed. Please try again.");
    }
  };

  // ── Success screen (org) ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              The Piyupair admin will review your organization request and contact you at{" "}
              <strong>{email}</strong>.
            </p>
            <Link to="/" className="text-blue-600 hover:underline text-sm">Return to Home</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Progress bar helper ─────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
            ${step === s ? "bg-blue-600 text-white" : step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
            {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < totalSteps && <div className={`h-0.5 w-8 transition-colors ${step > s ? "bg-green-500" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );

  // ─── Shared select class ──────────────────────────────────────────────────────
  const selectCls = "w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Account Type
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-8">
              <GraduationCap className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
              <p className="text-gray-500 mt-1">First, tell us what best describes you</p>
            </div>

            <StepIndicator />

            <div className="grid md:grid-cols-3 gap-4">
              {/* Student */}
              <button
                onClick={() => { setAccountType("student"); next(); }}
                className={`group p-6 border-2 rounded-xl text-left transition-all hover:border-blue-500 hover:bg-blue-50
                  ${accountType === "student" ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}
              >
                <BookOpen className="h-8 w-8 text-blue-600 mb-3" />
                <p className="font-semibold text-gray-900">Student</p>
                <p className="text-xs text-gray-500 mt-1">I want to find tutors and access learning resources</p>
              </button>

              {/* Tutor */}
              <button
                onClick={() => { setAccountType("tutor"); next(); }}
                className={`group p-6 border-2 rounded-xl text-left transition-all hover:border-purple-500 hover:bg-purple-50
                  ${accountType === "tutor" ? "border-purple-600 bg-purple-50" : "border-gray-200"}`}
              >
                <GraduationCap className="h-8 w-8 text-purple-600 mb-3" />
                <p className="font-semibold text-gray-900">Tutor</p>
                <p className="text-xs text-gray-500 mt-1">I'm affiliated with an organization and teach students</p>
              </button>

              {/* Organization */}
              <button
                onClick={() => { setAccountType("organization"); next(); }}
                className={`group p-6 border-2 rounded-xl text-left transition-all hover:border-green-500 hover:bg-green-50
                  ${accountType === "organization" ? "border-green-600 bg-green-50" : "border-gray-200"}`}
              >
                <Building2 className="h-8 w-8 text-green-600 mb-3" />
                <p className="font-semibold text-gray-900">Organization</p>
                <p className="text-xs text-gray-500 mt-1">We manage tutors and provide educational services</p>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2 — Personal / Organization Info
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    const canContinue = accountType === "organization"
      ? orgName.trim() !== "" && firstName.trim() !== "" && lastName.trim() !== "" && email.trim() !== ""
      : firstName.trim() !== "" && lastName.trim() !== "";

    const handleNext2 = () => {
      if (!canContinue) { toast.error("Please fill in all required fields."); return; }
      if (accountType === "organization") {
        // submit directly
        void handleSubmit();
      } else {
        next();
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <User className="h-10 w-10 text-blue-600 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-gray-900">
                {accountType === "organization" ? "Organization Details" : "Personal Information"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {accountType === "organization"
                  ? "Tell us about your organization"
                  : "How should we address you?"}
              </p>
            </div>

            <StepIndicator />

            <div className="space-y-4">
              {/* Organization name (org only) */}
              {accountType === "organization" && (
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name <span className="text-red-500">*</span></Label>
                  <Input id="orgName" placeholder="Excellence Tutoring Center" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
              )}

              {/* Name fields */}
              <div className="grid md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    {accountType === "organization" ? "Contact First Name" : "First Name"}{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input id="firstName" placeholder="Juan" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input id="middleName" placeholder="Santos (optional)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="lastName" placeholder="dela Cruz" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="w-40 space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <select id="suffix" className={selectCls} value={suffix} onChange={(e) => setSuffix(e.target.value)}>
                  {SUFFIXES.map((s) => <option key={s} value={s}>{s || "None"}</option>)}
                </select>
              </div>

              {/* Organization contact email collected here already */}
              {accountType === "organization" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="orgEmail">Contact Email <span className="text-red-500">*</span></Label>
                    <Input id="orgEmail" type="email" placeholder="contact@org.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgMessage">Message to Admin <span className="text-gray-400 text-xs">(optional)</span></Label>
                    <Textarea id="orgMessage" placeholder="Brief description of your organization…" rows={3} value={orgMessage} onChange={(e) => setOrgMessage(e.target.value)} />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={back} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleNext2} className="flex-1" disabled={!canContinue || loading}>
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
                  : accountType === "organization"
                  ? <>Submit Request <ChevronRight className="h-4 w-4 ml-1" /></>
                  : <>Continue <ChevronRight className="h-4 w-4 ml-1" /></>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 — Role-specific Details
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 3 && accountType !== "organization") {
    const programs = department ? DEPARTMENTS[department] ?? [] : [];

    const canContinue = accountType === "student"
      ? studentId.trim() !== "" && yearLevel !== "" && department !== "" && program !== ""
      : orgCode.trim() !== "" && subjects.trim() !== "" && education.trim() !== "" && experience.trim() !== "";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <BookOpen className="h-10 w-10 text-blue-600 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-gray-900">
                {accountType === "student" ? "Academic Information" : "Professional Details"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {accountType === "student"
                  ? "Tell us about your studies"
                  : "Tell us about your teaching background"}
              </p>
            </div>

            <StepIndicator />

            {/* STUDENT fields */}
            {accountType === "student" && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID Number <span className="text-red-500">*</span></Label>
                    <Input id="studentId" placeholder="2026-12345" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearLevel">Year Level <span className="text-red-500">*</span></Label>
                    <select id="yearLevel" className={selectCls} value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                      <option value="">Select year level</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                    </select>
                  </div>
                </div>

                {/* Cascading Department → Program */}
                <div className="space-y-2">
                  <Label htmlFor="department">Department / College <span className="text-red-500">*</span></Label>
                  <select id="department" className={selectCls} value={department} onChange={(e) => handleDepartmentChange(e.target.value)}>
                    <option value="">Select department</option>
                    {Object.keys(DEPARTMENTS).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">
                    Program <span className="text-red-500">*</span>
                    {!department && <span className="text-xs text-gray-400 ml-2">(select a department first)</span>}
                  </Label>
                  <select
                    id="program"
                    className={`${selectCls} ${!department ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    disabled={!department}
                  >
                    <option value="">Select program</option>
                    {programs.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* TUTOR fields */}
            {accountType === "tutor" && (
              <div className="space-y-4">
                <div className="mb-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> You need a unique organization code before registering.
                    Contact your organization directly to obtain it.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgCode">Organization Unique Code <span className="text-red-500">*</span></Label>
                  <Input id="orgCode" placeholder="ORG-XXXXX" className="uppercase" value={orgCode} onChange={(e) => setOrgCode(e.target.value.toUpperCase())} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects You Can Teach <span className="text-red-500">*</span></Label>
                  <Input id="subjects" placeholder="Mathematics, Physics, Chemistry" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Educational Background <span className="text-red-500">*</span></Label>
                  <Textarea id="education" placeholder="Bachelor of Science in Mathematics, University XYZ (2022)" value={education} onChange={(e) => setEducation(e.target.value)} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Teaching Experience <span className="text-red-500">*</span></Label>
                  <Textarea id="experience" placeholder="3 years private tutoring, 1 year as teaching assistant…" value={experience} onChange={(e) => setExperience(e.target.value)} rows={2} />
                </div>

                {/* Credential Upload */}
                <div className="space-y-2">
                  <Label>Upload Credentials <span className="text-gray-400 text-xs">(optional)</span></Label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-md p-5 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {credentials.length > 0 ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">{credentials.length} file(s) selected</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-gray-400 mx-auto mb-1" />
                        <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                        <span className="text-xs text-gray-400 block mt-1">Grades, Certificates, Documents (PDF, JPG, PNG)</span>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files && setCredentials(Array.from(e.target.files))} className="hidden" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={back} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={next} className="flex-1" disabled={!canContinue}>
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Org submits directly from Step 2 above — no Step 3 for org.
  if (step === 4 && accountType !== "organization") {
    const canSubmit = email.trim() !== "" && password.length >= 8 && password === confirmPassword;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="text-center mb-6">
              <Lock className="h-10 w-10 text-blue-600 mx-auto mb-2" />
              <h1 className="text-2xl font-bold text-gray-900">Account Security</h1>
              <p className="text-gray-500 text-sm mt-1">Set up your email and password</p>
            </div>

            <StepIndicator />

            {/* Approval notice */}
            <div className="mb-5 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                {accountType === "student"
                  ? "Student accounts require admin approval before you can sign in."
                  : "Tutor accounts are reviewed by your organization before you can sign in."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Email + Send Code */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="juan@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={!email || sendingCode}
                    className="shrink-0 gap-1"
                  >
                    {sendingCode
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Send className="h-3.5 w-3.5" /> Send Code</>
                    }
                  </Button>
                </div>
              </div>

              {/* Verification Code (appears after sending) */}
              {codeSent && (
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">
                    <Mail className="inline h-4 w-4 mr-1 text-blue-600" />
                    Verification Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="verificationCode"
                    placeholder="Enter 6-digit code from your email"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Didn't receive it? Check your spam folder or click Send Code again.</p>
                </div>
              )}

              {/* Password */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={confirmPassword && password !== confirmPassword ? "border-red-400" : ""}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={back} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={loading || !canSubmit}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
                  : accountType === "student" ? "Register as Student" : "Submit Application"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 org → Submit (handled inside step 2 "next" → submit)
  // ─────────────────────────────────────────────────────────────────────────────
  // Org submits directly from step 2 button click
  if (step === 3 && accountType === "organization") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10">
            <Loader2 className="h-10 w-10 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Submitting your organization request…</p>
            <Button
              className="mt-6 w-full"
              disabled={loading}
              onClick={handleSubmit}
            >{loading ? "Submitting…" : "Confirm Submit"}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
