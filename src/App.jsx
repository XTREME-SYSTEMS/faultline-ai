import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// FaultLine pages
import Home from '@/pages/Home';
import MarketingPage from '@/pages/MarketingPage';
import Checkout from '@/pages/Checkout';
import Overview from '@/pages/Overview';
import Module from '@/pages/Module';
import Admin from '@/pages/Admin';
import DriveSync from '@/pages/DriveSync';
import DiscoveryEngine from '@/pages/DiscoveryEngine';
import SetupWizard from '@/pages/SetupWizard';
import ClientSetupWizard from '@/pages/ClientSetupWizard';
import SystemClone from '@/pages/SystemClone';
import SecurityPipeline from '@/pages/SecurityPipeline';
import IndustryOpportunities from '@/pages/IndustryOpportunities';
import AiControlPanel from '@/pages/AiControlPanel';
import ClientDemoPortal from '@/pages/ClientDemoPortal';
import DeliverableStudio from '@/pages/DeliverableStudio';
import UniversalBuilder from '@/pages/UniversalBuilder';
import QADashboard from '@/pages/QADashboard';
import CommandCenter from '@/pages/CommandCenter';
import ClientROI from '@/pages/ClientROI';
import CompetitiveIntel from '@/pages/CompetitiveIntel';
import ImplementationMarketplace from '@/pages/ImplementationMarketplace';
import WhiteLabel from '@/pages/WhiteLabel';
import AuditTemplates from '@/pages/AuditTemplates';
import PartnerPortal from '@/pages/PartnerPortal';
import FinancialSync from '@/pages/FinancialSync';
import ESignature from '@/pages/ESignature';
import ESignDashboard from '@/pages/esign/ESignDashboard';
import NewEnvelope from '@/pages/esign/NewEnvelope';
import EnvelopeDetail from '@/pages/esign/EnvelopeDetail';
import SignDocument from '@/pages/esign/SignDocument';
import BooksDashboard from '@/pages/books/BooksDashboard';
import InvoiceList from '@/pages/books/InvoiceList';
import NewInvoice from '@/pages/books/NewInvoice';
import InvoiceDetail from '@/pages/books/InvoiceDetail';
import ExpenseList from '@/pages/books/ExpenseList';
import ChartOfAccounts from '@/pages/books/ChartOfAccounts';
import FinancialReports from '@/pages/books/FinancialReports';
import CompanyDetail from '@/pages/CompanyDetail';
import RepairBoard from '@/pages/RepairBoard';
import Chat from '@/pages/Chat';
import Trends from '@/pages/Trends';
import CustomerPortal from '@/pages/CustomerPortal';
import NotFound from '@/pages/NotFound';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      {/* Public marketing */}
      <Route path="/" element={<Home />} />
      <Route path="/product" element={<MarketingPage page="product" />} />
      <Route path="/solutions" element={<MarketingPage page="solutions" />} />
      <Route path="/industries" element={<MarketingPage page="industries" />} />
      <Route path="/how-it-works" element={<MarketingPage page="how-it-works" />} />
      <Route path="/pricing" element={<MarketingPage page="pricing" />} />
      <Route path="/resources" element={<MarketingPage page="resources" />} />
      <Route path="/security" element={<MarketingPage page="security" />} />
      <Route path="/about" element={<MarketingPage page="about" />} />
      <Route path="/contact" element={<MarketingPage page="contact" />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/portal/:companyId" element={<CustomerPortal />} />
      <Route path="/sign/:token" element={<SignDocument />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected portal */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/app" element={<Overview />} />
        <Route path="/app/setup" element={<SetupWizard />} />
        <Route path="/app/client-setup" element={<ClientSetupWizard />} />
        <Route path="/app/discovery-engine" element={<DiscoveryEngine />} />
        <Route path="/app/chat" element={<Chat />} />
        <Route path="/app/trends" element={<Trends />} />
        <Route path="/app/companies/:id" element={<CompanyDetail />} />
        <Route path="/app/companies/:id/clone" element={<SystemClone />} />
        <Route path="/app/companies/:id/repair-board" element={<RepairBoard />} />
        <Route path="/app/security-pipeline" element={<SecurityPipeline />} />
        <Route path="/app/security-pipeline/:id" element={<SecurityPipeline />} />
        <Route path="/app/industry-opportunities" element={<IndustryOpportunities />} />
        <Route path="/app/ai-control" element={<AiControlPanel />} />
        <Route path="/app/demo-portal" element={<ClientDemoPortal />} />
        <Route path="/app/deliverable-studio" element={<DeliverableStudio />} />
        <Route path="/app/universal-builder" element={<UniversalBuilder />} />
        <Route path="/app/qa-center" element={<QADashboard />} />
        <Route path="/app/command-center" element={<CommandCenter />} />
        <Route path="/app/roi" element={<ClientROI />} />
        <Route path="/app/competitive-intel" element={<CompetitiveIntel />} />
        <Route path="/app/marketplace" element={<ImplementationMarketplace />} />
        <Route path="/app/white-label" element={<WhiteLabel />} />
        <Route path="/app/audit-templates" element={<AuditTemplates />} />
        <Route path="/app/partner-api" element={<PartnerPortal />} />
        <Route path="/app/financial-sync" element={<FinancialSync />} />
        <Route path="/app/e-signature" element={<ESignature />} />
        <Route path="/app/esign" element={<ESignDashboard />} />
        <Route path="/app/esign/new" element={<NewEnvelope />} />
        <Route path="/app/esign/:id" element={<EnvelopeDetail />} />
        <Route path="/app/books" element={<BooksDashboard />} />
        <Route path="/app/books/invoices" element={<InvoiceList />} />
        <Route path="/app/books/invoices/new" element={<NewInvoice />} />
        <Route path="/app/books/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/app/books/expenses" element={<ExpenseList />} />
        <Route path="/app/books/accounts" element={<ChartOfAccounts />} />
        <Route path="/app/books/reports" element={<FinancialReports />} />
        <Route path="/app/demo-portal/:companyId" element={<ClientDemoPortal />} />
        <Route path="/app/drive-sync" element={<DriveSync />} />
        <Route path="/app/:slug" element={<Module />} />
        <Route path="/admin" element={<Admin />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App