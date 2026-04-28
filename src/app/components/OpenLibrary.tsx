import { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Download, Search, Star, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Material {
  id: string;
  title: string;
  subject: string;
  organization_name: string;
  tutor_name: string;
  downloads: number;
  rating: number;
  file_url: string;
}

const mockMaterials = [
  {
    id: "1",
    title: "Calculus I - Complete Notes",
    subject: "Mathematics",
    organization: "Excellence Tutoring Center",
    tutor: "Dr. Michael Johnson",
    downloads: 234,
    rating: 4.9,
    type: "PDF",
  },
  {
    id: "2",
    title: "Physics Lab Manual",
    subject: "Physics",
    organization: "Academic Success Institute",
    tutor: "Sarah Williams",
    downloads: 189,
    rating: 4.8,
    type: "PDF",
  },
  {
    id: "3",
    title: "Python Programming Guide",
    subject: "Computer Science",
    organization: "Tech Academy",
    tutor: "James Chen",
    downloads: 412,
    rating: 5.0,
    type: "PDF",
  },
  {
    id: "4",
    title: "Chemistry Cheat Sheet",
    subject: "Chemistry",
    organization: "Excellence Tutoring Center",
    tutor: "Dr. Emily Davis",
    downloads: 301,
    rating: 4.7,
    type: "PDF",
  },
];

export function OpenLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
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

      setMaterials(mapped);
    } catch (err) {
      console.error("Error fetching materials:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = subjectFilter === "all" || material.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const handleDownload = async (materialId: string, url: string) => {
    window.open(url, "_blank");
    await supabase.rpc("increment_material_downloads", { p_material_id: materialId });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Open Library</h1>
          <p className="text-gray-600 mt-1">
            Access learning materials shared by organizations
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <BookOpen className="h-10 w-10 text-blue-600" />
                    <Badge>PDF</Badge>
                  </div>
                  <CardTitle className="mt-4">{material.title}</CardTitle>
                  <CardDescription>{material.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Organization:</strong> {material.organization_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Created by:</strong> {material.tutor_name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{material.rating}</span>
                      </div>
                      <span className="text-sm text-gray-500">{material.downloads} downloads</span>
                    </div>
                    <Button className="w-full" onClick={() => handleDownload(material.id, material.file_url)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredMaterials.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No materials found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
