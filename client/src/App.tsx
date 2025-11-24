import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffTaskDetail from "./pages/staff/TaskDetail";
import SupervisorDashboard from "./pages/supervisor/Dashboard";
import SupervisorStaff from "./pages/supervisor/Staff";
import SupervisorStaffEdit from "./pages/supervisor/StaffEdit";
import SupervisorTaskForward from "./pages/supervisor/TaskForward";
import SupervisorTaskReview from "./pages/supervisor/TaskReview";
import GMDashboard from "./pages/gm/Dashboard";
import GMUsers from "./pages/gm/Users";
import GMUserNew from "./pages/gm/UserNew";
import GMUserEdit from "./pages/gm/UserEdit";
import GMTaskDetail from "./pages/gm/TaskDetail";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
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
