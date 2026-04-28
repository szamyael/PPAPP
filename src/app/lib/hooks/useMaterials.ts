import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";

export interface Material {
  id: string;
  title: string;
  subject: string;
  organization_name: string;
  tutor_name: string;
  downloads: number;
  rating: number;
  file_url: string;
}

interface DbMaterial {
  id: string;
  title: string;
  subject: string;
  download_count: number;
  file_url: string;
  tutor: {
    full_name: string;
  } | null;
  organization: {
    name: string;
  } | null;
}

async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select(`
      id,
      title,
      subject,
      download_count,
      file_url,
      tutor:profiles!materials_tutor_id_fkey (
        full_name
      ),
      organization:organizations (
        name
      )
    `)
    .eq("is_open_library", true)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const mapped: Material[] = (data || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    subject: m.subject || "General",
    organization_name: m.organization?.name || "Independent",
    tutor_name: m.tutor?.full_name || "Unknown",
    downloads: m.download_count || 0,
    rating: 4.8, // Default rating if no system exists yet
    file_url: m.file_url,
  }));

  return mapped;
}

export function useMaterials() {
  return useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}