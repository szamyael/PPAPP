import { Outlet } from "react-router";
import { FloatingSupportWidget } from "./FloatingSupportWidget";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useState } from "react";

export function Root() {
  const { loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before rendering outlet
    // This ensures all providers are ready
    if (!loading) {
      setMounted(true);
    }
  }, [loading]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
      <FloatingSupportWidget />
    </div>
  );
}

