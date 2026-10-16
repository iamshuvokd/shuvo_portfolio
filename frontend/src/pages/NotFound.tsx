import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="hero-grid absolute inset-0 opacity-60" />
      <div className="relative text-center">
        <p className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-8xl font-bold tracking-tight text-transparent sm:text-9xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground sm:text-3xl">Oops! Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild className="mt-8">
          <a href="/">
            <ArrowLeft className="h-4 w-4" />
            Return to Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
