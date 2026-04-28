import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export interface Booking {
  id: string;
  subject: string;
  topic: string;
  start_time: string;
  end_time: string;
  status: string;
  other_party_name: string;
  other_party_avatar?: string;
  rated: boolean;
  date: string;
  time: string;
  duration: string;
}

export interface UpcomingSession {
  id: string;
  subject: string;
  tutor_name: string;
  date: string;
  time: string;
}

interface DbBooking {
  id: string;
  subject: string;
  topic: string;
  start_time: string;
  hours: number;
  status: string;
  other_party: {
    full_name: string;
    avatar_url?: string;
  } | null;
  ratings: { id: string }[];
}

function mapDbBookingToSession(s: any): UpcomingSession {
  return {
    id: s.id,
    subject: s.subject,
    tutor_name: s.tutor?.full_name || "Unknown Tutor",
    date: new Date(s.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: new Date(s.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

async function fetchAllBookings(userId: string): Promise<Booking[]> {
  const isTutor = false; // Will be determined by the caller
  const fieldToMatch = "student_id";
  const joinField = "tutor_id";

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      subject,
      topic,
      start_time,
      hours,
      status,
      other_party:profiles!bookings_${joinField}_fkey (
        full_name,
        avatar_url
      ),
      ratings (
        id
      )
    `)
    .eq(fieldToMatch, userId)
    .order("start_time", { ascending: false });

  if (error) throw error;

  const mapped: Booking[] = (data || []).map((s: any) => {
    const start = new Date(s.start_time);
    const end = new Date(start.getTime() + s.hours * 60 * 60 * 1000);
    const durationHours = s.hours;

    return {
      id: s.id,
      other_party_name: s.other_party?.full_name || "Unknown",
      other_party_avatar: s.other_party?.avatar_url,
      subject: s.subject,
      topic: s.topic,
      date: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      duration: `${durationHours} hour${durationHours !== 1 ? "s" : ""}`,
      status: s.status,
      rated: (s.ratings || []).length > 0,
      start_time: s.start_time,
      end_time: end.toISOString(),
    };
  });

  return mapped;
}

async function fetchTutorBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      subject,
      topic,
      start_time,
      hours,
      status,
      other_party:profiles!bookings_student_id_fkey (
        full_name,
        avatar_url
      ),
      ratings (
        id
      )
    `)
    .eq("tutor_id", userId)
    .order("start_time", { ascending: false });

  if (error) throw error;

  const mapped: Booking[] = (data || []).map((s: any) => {
    const start = new Date(s.start_time);
    const end = new Date(start.getTime() + s.hours * 60 * 60 * 1000);
    const durationHours = s.hours;

    return {
      id: s.id,
      other_party_name: s.other_party?.full_name || "Unknown",
      other_party_avatar: s.other_party?.avatar_url,
      subject: s.subject,
      topic: s.topic,
      date: start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      duration: `${durationHours} hour${durationHours !== 1 ? "s" : ""}`,
      status: s.status,
      rated: (s.ratings || []).length > 0,
      start_time: s.start_time,
      end_time: end.toISOString(),
    };
  });

  return mapped;
}

async function fetchUpcomingSessions(userId: string): Promise<UpcomingSession[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      subject,
      start_time,
      tutor:profiles!bookings_tutor_id_fkey (
        full_name
      )
    `)
    .eq("student_id", userId)
    .gte("start_time", new Date().toISOString())
    .eq("status", "confirmed")
    .order("start_time", { ascending: true })
    .limit(3);

  if (error) throw error;
  return (data || []).map(mapDbBookingToSession);
}

export function useStudentBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["bookings", "student", userId],
    queryFn: () => fetchAllBookings(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTutorBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["bookings", "tutor", userId],
    queryFn: () => fetchTutorBookings(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUpcomingSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ["bookings", "upcoming", userId],
    queryFn: () => fetchUpcomingSessions(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - upcoming sessions may change
  });
}

export function useBookingsSubscription(userId: string | undefined) {
  const queryClient = useQueryClient();

  return supabase
    .channel(`bookings-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      () => {
        // Invalidate all bookings queries for this user
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["bookings", "student", userId] });
          queryClient.invalidateQueries({ queryKey: ["bookings", "tutor", userId] });
          queryClient.invalidateQueries({ queryKey: ["bookings", "upcoming", userId] });
        }
      }
    )
    .subscribe();
}