import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import NewConsultationV2 from "./pages/NewConsultationV2";
import ConsultationDetail from "./pages/ConsultationDetail";
import TranscriptionReview from "./pages/TranscriptionReview";
import PatientsV2 from "./pages/PatientsV2";
import PatientDetail from "./pages/PatientDetail";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/new-consultation"} component={NewConsultationV2} />
      <Route path={"/consultation/:id/review"} component={TranscriptionReview} />
      <Route path={"/consultation/:id"} component={ConsultationDetail} />
      <Route path={"/patients"} component={PatientsV2} />
      <Route path={"/patient/:id"} component={PatientDetail} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
