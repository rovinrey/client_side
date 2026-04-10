import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import NotificationPanel from './components/NotificationPanel';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

import BeneficiaryDashboard from './pages/beneficiary/BeneficiaryDashboard';
import BeneficiaryApplication from './pages/beneficiary/BeneficiaryApplication';
import BeneficiaryAttendance from './pages/beneficiary/BeneficiaryAttendance';
import BeneficiaryPayment from './pages/beneficiary/BeneficiaryPayment';
import BeneficiaryRequirements from './pages/beneficiary/BeneficiaryRequirements';
import SpesOfficialForms from './pages/beneficiary/forms/SpesOfficialForms';
import ProtectedRoute from './components/ProtectedRoute';

import Sidebar from "./components/Sidebar"; // Check your actual path here
import BeneficiarySidebar from "./components/BeneficiarySidebar";
import StaffSidebar from './components/StaffSidebar';


import AdminDashboard from './pages/admin/navigation/AdminDashboard';
import Beneficiaries from './pages/admin/navigation/Beneficiary';
import Programs from './pages/admin/navigation/Programs';
import Payment from './pages/admin/navigation/Payment'
import Reports from './pages/admin/navigation/Reports';
import AttendancePage from './pages/admin/navigation/Attendance';
import ApplicationApproval from './pages/admin/navigation/ApplicationApproval';
import ApplicationDetails from './pages/admin/navigation/ApplicationDetails';
import DocumentsReview from './pages/admin/navigation/DocumentsReview';
import ProgramAttendance from './pages/admin/navigation/ProgramAttendance';

import StaffDashboard from './pages/staff/StaffDashboard';
import StaffApplications from './pages/staff/StaffApplications';
import StaffApplicationDetails from './pages/staff/StaffApplicationDetails';

// 1. Create an Admin Layout so the Sidebar is persistent
// 1. Create an Admin Layout with a FIXED Sidebar
const AdminLayout = () => (
  <div className="flex bg-gray-50 h-screen overflow-hidden">
    {/* Sidebar wrapper to ensure it takes full height and doesn't shrink */}
    <div className="w-64 h-full flex-shrink-0">
      <Sidebar />
    </div>

    {/* Main content area that scrolls independently */}
    <main className="flex-1 overflow-y-auto p-8">
      <Outlet />
    </main>
  </div>
);

// Do the same for StaffLayout
const StaffLayout = () => (
  <div className="flex bg-gray-50 h-screen overflow-hidden">
    <div className="w-64 h-full flex-shrink-0">
      <StaffSidebar />
    </div>
    <main className="flex-1 overflow-y-auto p-8">
      <Outlet />
    </main>
  </div>
);

// Beneficiary Layout
const BeneficiaryLayout = () => {
  const [isOpen, setIsOpen] = useState(false); // Default closed on mobile

  return (
    <div className="bg-gray-50 min-h-screen overflow-x-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-700/50 z-40">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-4 text-xl font-bold text-amber-400">PESO Juban</h1>
        </div>
        <div className="[&_button]:text-slate-300 [&_button]:hover:bg-slate-800">
          <NotificationPanel />
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-[1px] z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar + Top Nav + Content */}
      <div className="lg:flex lg:flex-row">
        <div className="lg:w-64 lg:flex-shrink-0">
          <BeneficiarySidebar isOpen={isOpen} setIsOpen={setIsOpen} />
        </div>

        <div className="flex-1 flex flex-col">
          {/* Desktop Top Nav */}
          <div className="hidden lg:flex items-center justify-end px-8 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
            <NotificationPanel />
          </div>

          {/* Main content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Admin Protected Routes with Sidebar */}
        <Route
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* All these paths will now show the Sidebar */}
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/beneficiaries" element={<Beneficiaries />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/attendance" element={<ProgramAttendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/applications" element={<ApplicationApproval />} />
          <Route path="/applications/:applicationId" element={<ApplicationDetails />} />
          <Route path="/documents-review" element={<DocumentsReview />} />

          {/* Redirect /admin to /dashboard */}
          <Route path="/admin" element={<Navigate to="/dashboard" />} />

        </Route>

        {/* Staff Protected Routes with Sidebar - same pages as admin, no approve/reject */}
        <Route
          element={
            <ProtectedRoute allowedRole="staff">
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/staff/beneficiaries" element={<Beneficiaries />} />
          <Route path="/staff/attendance" element={<AttendancePage />} />
          <Route path="/staff/payment" element={<Payment />} />
          <Route path="/staff/programs" element={<Programs />} />
          <Route path="/staff/programs/attendance" element={<ProgramAttendance />} />
          <Route path="/staff/documents-review" element={<DocumentsReview />} />
          <Route path="/staff/reports" element={<Reports />} />
          <Route path="/staff/applications" element={<StaffApplications />} />
          <Route path="/staff/applications/:applicationId" element={<StaffApplicationDetails />} />
        </Route>


        {/* Beneficiary Protected Routes with Sidebar */}
        <Route
          element={
            <ProtectedRoute allowedRole="beneficiary">
              <BeneficiaryLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/beneficiary" element={<BeneficiaryDashboard />} />
          <Route path="/beneficiary/application" element={<BeneficiaryApplication />} />
          <Route path="/beneficiary/requirements" element={<BeneficiaryRequirements />} />
          <Route path="/beneficiary/spes-forms" element={<SpesOfficialForms />} />
          <Route path="/beneficiary/attendance" element={<BeneficiaryAttendance />} />
          <Route path="/beneficiary/payment" element={<BeneficiaryPayment />} />
        </Route>



        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;