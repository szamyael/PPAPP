import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

interface SafeContextWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper that ensures we're inside the AuthContext provider
 * before rendering children. Prevents React error #321.
 */
export function SafeContextWrapper({ children, fallback }: SafeContextWrapperProps) {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    return <>{fallback || <div>Loading...</div>}</>;
  }

  return <>{children}</>;
}
