import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  members: number;
  description: string;
  admin: string;
}

interface DbStudyGroup {
  id: string;
  name: string;
  subject: string;
  member_count: number;
  description: string;
  admin_name: string;
}

function mapDbGroup(row: DbStudyGroup): StudyGroup {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    members: row.member_count,
    description: row.description,
    admin: row.admin_name,
  };
}

async function fetchStudyGroups(): Promise<StudyGroup[]> {
  const { data, error } = await supabase
    .from("study_groups")
    .select("id, name, subject, member_count, description, admin_name")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: DbStudyGroup) => mapDbGroup(row));
}

export function useStudyGroups() {
  return useQuery({
    queryKey: ["studyGroups"],
    queryFn: fetchStudyGroups,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useStudyGroupsSubscription() {
  const queryClient = useQueryClient();

  return supabase
    .channel("study-groups")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_groups" }, (payload) => {
      const newGroup = mapDbGroup(payload.new as DbStudyGroup);
      queryClient.setQueryData(["studyGroups"], (old: StudyGroup[] | undefined) => {
        if (!old) return [newGroup];
        if (old.some((g) => g.id === newGroup.id)) return old;
        return [newGroup, ...old];
      });
    })
    .subscribe();
}