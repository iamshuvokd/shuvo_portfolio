import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ContentProvider } from "./context/ContentContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Admin is code-split so visitors never download the editor.
const Admin = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ContentProvider>
        <ErrorBoundary
          name="app"
          fallback={
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
              <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">Please reload the page. If it keeps happening, try again in a few minutes.</p>
              <button className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          }
        >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/admin"
              element={
                <Suspense fallback={null}>
                  <Admin />
                </Suspense>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ErrorBoundary>
      </ContentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
