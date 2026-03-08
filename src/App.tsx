import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import GuardDashboard from "./pages/guard/GuardDashboard";
import AddVisitorPage from "./pages/guard/AddVisitorPage";
import VisitorStatusPage from "./pages/guard/VisitorStatusPage";
import GuardAttendancePage from "./pages/guard/GuardAttendancePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVisitorsPage from "./pages/admin/AdminVisitorsPage";
import AdminAttendancePage from "./pages/admin/AdminAttendancePage";
import AdminLeavesPage from "./pages/admin/AdminLeavesPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import CompanySetupPage from "./pages/admin/CompanySetupPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import AttendanceHistoryPage from "./pages/employee/AttendanceHistoryPage";
import LeaveRequestPage from "./pages/employee/LeaveRequestPage";
import NotFound from "./pages/NotFound";
import { usePushNotifications } from "./hooks/usePushNotifications";

// MailVortx
import MailLayout from "./pages/mail/MailLayout";
import InboxPage from "./pages/mail/InboxPage";
import SentPage from "./pages/mail/SentPage";
import StarredPage from "./pages/mail/StarredPage";
import DraftsPage from "./pages/mail/DraftsPage";
import TrashPage from "./pages/mail/TrashPage";
import EmailDetailPage from "./pages/mail/EmailDetailPage";
import LabelsPage from "./pages/mail/LabelsPage";

const queryClient = new QueryClient();

// MailVortx Protected wrapper (any authenticated role)
const MailProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRole="admin">
    {children}
  </ProtectedRoute>
);

// Inner component so it has access to AuthContext
const AppRoutes = () => {
  usePushNotifications();
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Guard Routes */}
      <Route path="/guard" element={<ProtectedRoute allowedRole="guard"><GuardDashboard /></ProtectedRoute>} />
      <Route path="/guard/add-visitor" element={<ProtectedRoute allowedRole="guard"><AddVisitorPage /></ProtectedRoute>} />
      <Route path="/guard/visitors" element={<ProtectedRoute allowedRole="guard"><VisitorStatusPage /></ProtectedRoute>} />
      <Route path="/guard/attendance" element={<ProtectedRoute allowedRole="guard"><GuardAttendancePage /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/company-setup" element={<ProtectedRoute allowedRole="admin"><CompanySetupPage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRole="admin"><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/visitors" element={<ProtectedRoute allowedRole="admin"><AdminVisitorsPage /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRole="admin"><AdminAttendancePage /></ProtectedRoute>} />
      <Route path="/admin/leaves" element={<ProtectedRoute allowedRole="admin"><AdminLeavesPage /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRole="admin"><AdminAnalyticsPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRole="admin"><AdminSettingsPage /></ProtectedRoute>} />

      {/* Employee Routes */}
      <Route path="/employee" element={<ProtectedRoute allowedRole="employee"><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/attendance" element={<ProtectedRoute allowedRole="employee"><AttendanceHistoryPage /></ProtectedRoute>} />
      <Route path="/employee/leave" element={<ProtectedRoute allowedRole="employee"><LeaveRequestPage /></ProtectedRoute>} />

      {/* MailVortx Routes — accessible to all authenticated users */}
      <Route path="/mail" element={<MailLayout />}>
        <Route index element={<Navigate to="/mail/inbox" replace />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="sent" element={<SentPage />} />
        <Route path="starred" element={<StarredPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="trash" element={<TrashPage />} />
        <Route path="email/:id" element={<EmailDetailPage />} />
        <Route path="labels" element={<LabelsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
