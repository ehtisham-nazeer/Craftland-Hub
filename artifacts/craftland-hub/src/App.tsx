import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import { SplashScreen } from "@/components/SplashScreen";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

// Layout
import Layout from "./components/layout/Layout";
import { useNotificationSSE } from "./hooks/useNotificationSSE";

// Pages
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import MapDetail from "./pages/MapDetail";
import Creators from "./pages/Creators";
import CreatorProfile from "./pages/CreatorProfile";
import SubmitMap from "./pages/SubmitMap";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Copyright from "./pages/Copyright";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import JoinCreator from "./pages/JoinCreator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function HomeRedirect() {
  return <Home />;
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/explore`}
        fallbackRedirectUrl={`${basePath}/explore`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/explore`}
        fallbackRedirectUrl={`${basePath}/explore`}
      />
    </div>
  );
}

function NotificationSSEActivator() {
  useNotificationSSE();
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user: u }) => {
      const userId = u?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
        if (userId && !prevUserIdRef.current) {
          const name = u?.firstName || u?.username || "back";
          toast.success(`Welcome${name !== "back" ? `, ${name}` : ""}!`, {
            description: "You're now signed in to CraftLand Hub.",
            duration: 3500,
          });
        }
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function InitialRedirect() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (location === "/" && localStorage.getItem("craftland_visited")) {
      setLocation("/explore", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function App() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <SplashScreen />
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <NotificationSSEActivator />
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <InitialRedirect />
            <ScrollToTop />
            <Layout>
              <Switch>
                <Route path="/" component={HomeRedirect} />
                <Route path="/sign-in/*?" component={SignInPage} />
                <Route path="/sign-up/*?" component={SignUpPage} />
                <Route path="/explore" component={Explore} />
                <Route path="/map/:id" component={MapDetail} />
                <Route path="/creators" component={Creators} />
                <Route path="/creator/:id" component={CreatorProfile} />
                <Route path="/submit" component={SubmitMap} />
                <Route path="/profile" component={Profile} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/admin-dashboard" component={AdminDashboard} />
                <Route path="/terms" component={Terms} />
                <Route path="/privacy" component={Privacy} />
                <Route path="/copyright" component={Copyright} />
                <Route path="/contact" component={Contact} />
                <Route path="/join-creator" component={JoinCreator} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </WouterRouter>
          <Toaster />
          <SonnerToaster
            position="top-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f2f2f2",
                fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
              },
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
