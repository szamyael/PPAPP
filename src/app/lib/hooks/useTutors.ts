import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

interface Tutor {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  subjects: string[];
  organization_name: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  experience: string;
  education: string;
  bio: string;
}

interface DbTutorProfile {
  id: string;
  user_id: string;
  hourly_rate: number;
  subjects: string[];
  experience: string;
  education: string;
  bio: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  }[];
  organizations: {
    name: string;
  }[];
}

interface Rating {
  rated_user: string;
  stars: number;
}

async function fetchTutors(): Promise<Tutor[]> {
  // Fetch tutors joined with profiles and organizations
  const { data, error } = await supabase
    .from("tutor_profiles")
    .select(`
      id,
      user_id,
      hourly_rate,
      subjects,
      experience,
      education,
      bio,
      profiles:user_id (
        full_name,
        avatar_url
      ),
      organizations:organization_id (
        name
      )
    `)
    .eq("approval_status", "approved");

  if (error) throw error;

  // Fetch ratings for these tutors
  const tutorUserIds = data.map((t: DbTutorProfile) => t.user_id);
  const { data: ratingsData, error: ratingsError } = await supabase
    .from("ratings")
    .select("rated_user, stars")
    .in("rated_user", tutorUserIds);

  if (ratingsError) throw ratingsError;

  const mappedTutors: Tutor[] = data.map((t: DbTutorProfile) => {
    const tutorRatings = (ratingsData || []).filter((r: Rating) => r.rated_user === t.user_id);
    const avgRating = tutorRatings.length > 0
      ? tutorRatings.reduce((sum: number, r: Rating) => sum + r.stars, 0) / tutorRatings.length
      : 0;

    return {
      id: t.id,
      user_id: t.user_id,
      full_name: t.profiles?.[0]?.full_name || "Unknown Tutor",
      avatar_url: t.profiles?.[0]?.avatar_url || "",
      subjects: t.subjects || [],
      organization_name: t.organizations?.[0]?.name || "Independent",
      rating: Number(avgRating.toFixed(1)),
      reviewCount: tutorRatings.length,
      hourlyRate: t.hourly_rate || 0,
      experience: t.experience || "",
      education: t.education || "",
      bio: t.bio || "",
    };
  });

  return mappedTutors;
}

export function useTutors() {
  return useQuery({
    queryKey: ["tutors"],
    queryFn: fetchTutors,
    staleTime: 5 * 60 * 1000, // 5 minutes - tutors data doesn't change frequently
  });
}