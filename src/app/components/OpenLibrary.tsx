import { useState, useMemo } from "react";
import { Navigation } from "./Navigation";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Download, Search, Star, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useMaterials } from "../lib/hooks";

export function OpenLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const { data: materials, isLoading, error } = useMaterials();

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    
    return materials.filter((material) => {
      const matchesSearch =
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = subjectFilter === "all" || material.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [materials, searchTerm, subjectFilter]);

  const handleDownload = async (materialId: string, url: string) => {
    window.open(url, "_blank");
    await supabase.rpc("increment_material_downloads", { p_material_id: materialId });
  };

  if (isLoading) {
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
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Open Library</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600">Error loading materials. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
        {filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No materials found.</p>
            </CardContent>
          </Card>
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
      </div>
    </div>
  );
}