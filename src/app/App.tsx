import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { QueryProvider } from "./lib/QueryProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen />}>
            <RouterProvider router={router} />
          </Suspense>
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
