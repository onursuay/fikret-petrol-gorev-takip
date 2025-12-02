import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Spinner } from "./components/ui/spinner";

// Lazy load pages for better code splitting
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/Login"));
const StaffDashboard = lazy(() => import("@/pages/staff/Dashboard"));
const StaffTaskDetail = lazy(() => import("@/pages/staff/TaskDetail"));
const SupervisorDashboard = lazy(() => import("@/pages/supervisor/Dashboard"));
const SupervisorStaff = lazy(() => import("@/pages/supervisor/Staff"));
const SupervisorStaffEdit = lazy(() => import("@/pages/supervisor/StaffEdit"));
const SupervisorTaskForward = lazy(() => import("@/pages/supervisor/TaskForward"));
const SupervisorTaskReview = lazy(() => import("@/pages/supervisor/TaskReview"));
const GMDashboard = lazy(() => import("@/pages/gm/Dashboard"));
const GMUsers = lazy(() => import("@/pages/gm/Users"));
const GMUserNew = lazy(() => import("@/pages/gm/UserNew"));
const GMUserEdit = lazy(() => import("@/pages/gm/UserEdit"));
const GMTaskDetail = lazy(() => import("@/pages/gm/TaskDetail"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    }>
      <Switch>
        <Route path={"/"} component={Login} />
        <Route path={"/staff/dashboard"} component={StaffDashboard} />
        <Route path="/staff/task/:id">
          {(params) => <StaffTaskDetail taskId={params.id} />}
        </Route>
        <Route path={"/supervisor/dashboard"} component={SupervisorDashboard} />
        <Route path={"/supervisor/staff"} component={SupervisorStaff} />
        <Route path="/supervisor/staff/:id/edit">
          {(params) => <SupervisorStaffEdit staffId={params.id} />}
        </Route>
        <Route path="/supervisor/task/:id/forward">
          {(params) => <SupervisorTaskForward taskId={params.id} />}
        </Route>
        <Route path="/supervisor/task/:id/review">
          {(params) => <SupervisorTaskReview taskId={params.id} />}
        </Route>
        <Route path="/gm/dashboard" component={GMDashboard} />
        <Route path="/gm/users" component={GMUsers} />
        <Route path="/gm/users/new" component={GMUserNew} />
        <Route path="/gm/users/:id/edit">
          {(params) => <GMUserEdit userId={params.id} />}
        </Route>
        <Route path="/gm/task/:id">
          {(params) => <GMTaskDetail taskId={params.id} />}
        </Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
