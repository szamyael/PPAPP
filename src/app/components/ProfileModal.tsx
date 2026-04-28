import React, { useState, useEffect } from "react";
import { useAuth, User } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, Save, User as UserIcon } from "lucide-react";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Basic Info
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    middleName: user?.middleName || "",
    lastName: user?.lastName || "",
    suffix: user?.suffix || "",
    name: user?.name || "",
    avatarUrl: user?.avatarUrl || "",
    // Student fields
    studentId: user?.studentId || "",
    program: user?.program || "",
    yearLevel: user?.yearLevel || "",
    department: user?.department || "",
  });

  // Tutor specific fields
  const [tutorData, setTutorData] = useState({
    hourlyRate: 0,
    bio: "",
    education: "",
    experience: "",
    subjects: [] as string[],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        suffix: user.suffix || "",
        name: user.name || "",
        avatarUrl: user.avatarUrl || "",
        studentId: user.studentId || "",
        program: user.program || "",
        yearLevel: user.yearLevel || "",
        department: user.department || "",
      });

      if (user.role === "tutor") {
        fetchTutorProfile();
      }
    }
  }, [user, open]);

  const fetchTutorProfile = async () => {
    const { data, error } = await supabase
      .from("tutor_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      setTutorData({
        hourlyRate: data.hourly_rate || 0,
        bio: data.bio || "",
        education: data.education || "",
        experience: data.experience || "",
        subjects: data.subjects || [],
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/avatar-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
      toast.success("Avatar uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update basic profile
      const fullName = [formData.firstName, formData.middleName, formData.lastName, formData.suffix]
        .filter(Boolean)
        .join(" ");

      const { success, error } = await updateProfile({
        ...formData,
        name: fullName || formData.name,
      });

      if (!success) throw new Error(error);

      // Update tutor profile if applicable
      if (user?.role === "tutor") {
        const { error: tutorError } = await supabase
          .from("tutor_profiles")
          .update({
            hourly_rate: tutorData.hourlyRate,
            bio: tutorData.bio,
            education: tutorData.education,
            experience: tutorData.experience,
            subjects: tutorData.subjects,
          })
          .eq("user_id", user.id);

        if (tutorError) throw tutorError;
      }

      toast.success("Profile updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Error updating password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information and profile picture.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-blue-100 ring-2 ring-white">
                <AvatarImage src={formData.avatarUrl} />
                <AvatarFallback className="bg-blue-50 text-blue-600">
                  <UserIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-gray-500">Click to change profile picture</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={e => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                value={formData.suffix}
                onChange={e => setFormData(prev => ({ ...prev, suffix: e.target.value }))}
                placeholder="Jr., III, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email (Account Credential)</Label>
            <Input value={user?.email} disabled className="bg-gray-50" />
            <p className="text-[10px] text-gray-400">Email cannot be changed directly here.</p>
          </div>

          <div className="pt-4 border-t space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Security</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            {newPassword && (
              <Button 
                type="button" 
                onClick={handlePasswordUpdate} 
                disabled={passwordLoading}
                variant="outline"
                className="w-full"
              >
                {passwordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Update Password"}
              </Button>
            )}
          </div>

          {/* Role Specific Fields */}
          {user?.role === "student" && (
            <div className="pt-4 border-t space-y-4">
              <h3 className="font-semibold text-sm text-gray-700">Student Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={formData.studentId}
                    onChange={e => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program">Program / Course</Label>
                  <Input
                    id="program"
                    value={formData.program}
                    onChange={e => setFormData(prev => ({ ...prev, program: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearLevel">Year Level</Label>
                  <Input
                    id="yearLevel"
                    value={formData.yearLevel}
                    onChange={e => setFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {user?.role === "tutor" && (
            <div className="pt-4 border-t space-y-4">
              <h3 className="font-semibold text-sm text-gray-700">Tutor Information</h3>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={tutorData.bio}
                  onChange={e => setTutorData(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (PHP)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={tutorData.hourlyRate}
                    onChange={e => setTutorData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects (comma separated)</Label>
                  <Input
                    id="subjects"
                    value={tutorData.subjects.join(", ")}
                    onChange={e => setTutorData(prev => ({ ...prev, subjects: e.target.value.split(",").map(s => s.trim()) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={tutorData.education}
                  onChange={e => setTutorData(prev => ({ ...prev, education: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  value={tutorData.experience}
                  onChange={e => setTutorData(prev => ({ ...prev, experience: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
