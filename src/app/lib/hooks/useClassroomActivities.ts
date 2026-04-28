import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export interface ClassroomActivity {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  submissions: number;
  totalStudents: number;
}

export interface ClassroomSubmission {
  id: string;
  activity_id: string;
}

interface DbClassroomActivity {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  total_students: number;
}

interface DbClassroomSubmission {
  id: string;
  activity_id: string;
}

function mapDbActivity(row: DbClassroomActivity): ClassroomActivity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    status: row.status,
    submissions: 0,
    totalStudents: row.total_students,
  };
}

async function fetchClassroomActivities(classroomId: string): Promise<ClassroomActivity[]> {
  const { data, error } = await supabase
    .from("classroom_activities")
    .select("id, title, description, due_date, status, total_students")
    .eq("classroom_id", classroomId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: DbClassroomActivity) => mapDbActivity(row));
}

async function fetchClassroomSubmissions(classroomId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("classroom_submissions")
    .select("id, activity_id")
    .eq("classroom_id", classroomId);

  if (error) throw error;

  const counts = (data as DbClassroomSubmission[]).reduce<Record<string, number>>((acc, row) => {
    acc[row.activity_id] = (acc[row.activity_id] ?? 0) + 1;
    return acc;
  }, {});

  return counts;
}

export function useClassroomActivities(classroomId: string | undefined) {
  return useQuery({
    queryKey: ["classroomActivities", classroomId],
    queryFn: () => fetchClassroomActivities(classroomId!),
    enabled: !!classroomId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useClassroomSubmissions(classroomId: string | undefined) {
  return useQuery({
    queryKey: ["classroomSubmissions", classroomId],
    queryFn: () => fetchClassroomSubmissions(classroomId!),
    enabled: !!classroomId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useClassroomSubscription(classroomId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!classroomId) return;

    const channel = supabase
      .channel(`classroom-${classroomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "classroom_activities" }, () => {
        queryClient.invalidateQueries({ queryKey: ["classroomActivities", classroomId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "classroom_submissions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["classroomSubmissions", classroomId] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [classroomId, queryClient]);
}