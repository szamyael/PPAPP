import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";

// ─────────────────────────────────────────────
// Types (kept backward-compatible with all 29 components)
// ─────────────────────────────────────────────
export type UserRole = "admin" | "student" | "tutor" | "organization";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  organizationId?: string;
  organizationName?: string;
  uniqueCode?: string;
  approved: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  register: (userData: RegisterPayload) => Promise<boolean>;
  verifyOtp: (email: string, token: string) => Promise<boolean>;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;          // full name (composed by the wizard)
  // Split name fields (from RegisterWizard)
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  role: UserRole | "organization_request";
  // Student fields
  studentId?: string;
  program?: string;
  yearLevel?: string;
  department?: string;
  // Tutor fields
  organizationCode?: string;
  subjects?: string;
  education?: string;
  experience?: string;
  // Org request fields
  orgName?: string;
  message?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// Helper: build User object from DB profile row
// ─────────────────────────────────────────────
function profileToUser(
  authId: string,
  email: string,
  profile: Record<string, any>
): User {
  return {
    id: authId,
    email,
    role: profile.role as UserRole,
    name: profile.full_name ?? "",
    organizationId: profile.organization_id ?? undefined,
    organizationName: profile.organizations?.name ?? undefined,
    uniqueCode: profile.organizations?.unique_code ?? undefined,
    approved: profile.approval_status === "approved",
  };
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Load profile from DB and update state
  const loadProfile = async (authSession: Session): Promise<User | null> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*, organizations(name, unique_code)")
      .eq("id", authSession.user.id)
      .maybeSingle();

    if (error || !profile) return null;

    return profileToUser(
      authSession.user.id,
      authSession.user.email ?? "",
      profile
    );
  };

  // ── Initialise: restore session from storage ──────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session: existingSession } } =
        await supabase.auth.getSession();

      if (existingSession && mounted) {
        setSession(existingSession);
        const appUser = await loadProfile(existingSession);
        if (mounted) setUser(appUser);
      }

      if (mounted) setLoading(false);
    };

    init();

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession) {
          const appUser = await loadProfile(newSession);
          setUser(appUser);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Login ──────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<string | null> => {
    setLoginError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setLoginError(error?.message ?? "Login failed");
      return null;
    }

    // Fetch profile to check approval status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, organizations(name, unique_code)")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setLoginError("Profile not found. Please contact support.");
      return null;
    }

    if (profile.approval_status === "pending") {
      await supabase.auth.signOut();
      setLoginError(
        profile.role === "tutor"
          ? "Your tutor application is pending review by your organization."
          : "Your account is pending admin approval. You'll receive an email when approved."
      );
      return null;
    }

    if (profile.approval_status === "rejected") {
      await supabase.auth.signOut();
      setLoginError("Your account application was not approved. Please contact support.");
      return null;
    }

    const appUser = profileToUser(data.user.id, data.user.email ?? "", profile);
    setUser(appUser);
    return profile.role;
  };

  // ── Logout ─────────────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // ── Register ───────────────────────────────────────────────────────
  const register = async (userData: RegisterPayload): Promise<boolean> => {
    setLoginError(null);

    // ── Organization request (no auth account; admin creates manually) ──
    if (userData.role === "organization_request") {
      const { error } = await supabase.from("org_requests").insert({
        org_name: userData.orgName ?? userData.name,
        contact_person: userData.name,
        email: userData.email,
        message: userData.message ?? null,
        status: "pending",
      });
      if (error) {
        setLoginError(error.message);
        return false;
      }
      return true;
    }

    // ── Tutor: validate org code before creating account ──
    let orgId: string | undefined;
    let orgName: string | undefined;

    if (userData.role === "tutor") {
      if (!userData.organizationCode) {
        setLoginError("Organization code is required for tutors.");
        return false;
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("unique_code", userData.organizationCode.toUpperCase().trim())
        .maybeSingle();

      if (orgError || !org) {
        setLoginError("Invalid organization code. Please check and try again.");
        return false;
      }

      orgId = org.id;
      orgName = org.name;
    }

    // ── Create Supabase auth account ──
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.name,
          role: userData.role,
        },
      },
    });

    if (error || !data.user) {
      setLoginError(error?.message ?? "Registration failed");
      return false;
    }

    // ── Extend profile with role-specific fields ──
    const profileUpdate: Record<string, unknown> = {};

    if (userData.studentId)   profileUpdate.student_id = userData.studentId;
    if (userData.program)      profileUpdate.program     = userData.program;
    if (userData.yearLevel)    profileUpdate.year_level  = userData.yearLevel;
    if (userData.department)   profileUpdate.department  = userData.department;
    if (orgId)                 profileUpdate.organization_id = orgId;
    // Split name fields
    if (userData.firstName)    profileUpdate.first_name  = userData.firstName;
    if (userData.middleName)   profileUpdate.middle_name = userData.middleName;
    if (userData.lastName)     profileUpdate.last_name   = userData.lastName;
    if (userData.suffix)       profileUpdate.suffix      = userData.suffix;

    if (Object.keys(profileUpdate).length > 0) {
      // Upsert in case trigger hasn't fired yet
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: userData.name,
        email: userData.email,
        role: userData.role as UserRole,
        approval_status: "pending",
        ...profileUpdate,
      });
    }

    // ── Create tutor sub-profile ──
    if (userData.role === "tutor") {
      await supabase.from("tutor_profiles").insert({
        user_id: data.user.id,
        organization_id: orgId,
        approval_status: "pending",
        subjects: userData.subjects
          ? userData.subjects.split(",").map((s: string) => s.trim())
          : [],
        education:   userData.education   ?? null,
        experience:  userData.experience  ?? null,
      });
    }

    // Sign out immediately — account must be approved before first login
    await supabase.auth.signOut();

    return true;
  };

  // ── Verify OTP ────────────────────────────────────────────────────
  const verifyOtp = async (email: string, token: string): Promise<boolean> => {
    setLoginError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      setLoginError(error.message);
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, loginError, login, logout, register, verifyOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};