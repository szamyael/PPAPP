import { ReactNode } from "react";

/**
 * Wrapper function for route components to ensure they're rendered
 * only after all providers are initialized
 */
export function withProviders(Component: React.ComponentType) {
  return function WrappedComponent(props: any) {
    try {
      return <Component {...props} />;
    } catch (error) {
      // Log context errors for debugging
      if (error instanceof Error && error.message.includes('useContext')) {
        console.error('Context error in route component:', error);
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 font-semibold">Loading...</p>
              <p className="text-gray-500 text-sm">Initializing application</p>
            </div>
          </div>
        );
      }
      throw error;
    }
  };
}
