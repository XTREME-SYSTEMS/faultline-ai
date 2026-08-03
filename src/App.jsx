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
import WebsiteGenerator from '@/pages/WebsiteGenerator';
import AppGenerator from '@/pages/AppGenerator';
import BusinessHub from '@/pages/business/BusinessHub';
import IdeaIntake from '@/pages/business/IdeaIntake';
import UniversalGenerator from '@/pages/UniversalGenerator';
import BrandGenerator from '@/pages/BrandGenerator';
import XPSCatalog from '@/pages/XPSCatalog';
import Marketplace from '@/pages/Marketplace';
import VisualMediaStudio from '@/pages/VisualMediaStudio';
import PCUMarketplace from '@/pages/PCUMarketplace';
import ToolAdvisor from '@/pages/ToolAdvisor';
import CompanyDetail from '@/pages/CompanyDetail';
import RepairBoard from '@/pages/RepairBoard';
import Chat from '@/pages/Chat';
import Trends from '@/pages/Trends';
import CustomerPortal from '@/pages/CustomerPortal';
import NotFound from '@/pages/NotFound';
// Xtreme Visualizer
import XVLayout from '@/components/vq/Layout';
import XVHome from '@/pages/xv/XVHome';
import XVVisualizer from '@/pages/xv/Visualizer';
import XVGenerator from '@/pages/xv/Generator';
import XVProducts from '@/pages/xv/Products';
import XVColorCharts from '@/pages/xv/ColorCharts';
import XVLeads from '@/pages/xv/Leads';
import XVLeadDetail from '@/pages/xv/LeadDetail';
import XVCRM from '@/pages/xv/CRM';
import XVLeadGenerator from '@/pages/xv/LeadGenerator';
import XVSystems from '@/pages/xv/Systems';
import XVPricing from '@/pages/xv/Pricing';
import XVCompetitivePricing from '@/pages/xv/CompetitivePricing';
import XVIndustryReference from '@/pages/xv/IndustryReference';
import XVClose from '@/pages/xv/Close';
import XVEmailTemplates from '@/pages/xv/EmailTemplates';
import XVBidGenerator from '@/pages/xv/BidGenerator';
import XVAppointments from '@/pages/xv/Appointments';
import XVInbox from '@/pages/xv/Inbox';
import XVReceipts from '@/pages/xv/Receipts';
import XVGuardrails from '@/pages/xv/Guardrails';
import XVSettings from '@/pages/xv/Settings';

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
        <Route path="/app/website-generator" element={<WebsiteGenerator />} />
        <Route path="/app/app-generator" element={<AppGenerator />} />
        <Route path="/app/business" element={<BusinessHub />} />
        <Route path="/app/business/:projectId/chat" element={<IdeaIntake />} />
        <Route path="/app/universal-generator" element={<UniversalGenerator />} />
        <Route path="/app/brand-generator" element={<BrandGenerator />} />
        <Route path="/app/xps-catalog" element={<XPSCatalog />} />
        <Route path="/app/marketplace" element={<Marketplace />} />
        <Route path="/app/visual-studio" element={<VisualMediaStudio />} />
        <Route path="/app/pcu-marketplace" element={<PCUMarketplace />} />
        <Route path="/app/tool-advisor" element={<ToolAdvisor />} />
        <Route path="/app/demo-portal/:companyId" element={<ClientDemoPortal />} />
        <Route path="/app/drive-sync" element={<DriveSync />} />
        <Route path="/app/xv" element={<XVLayout />}>
          <Route index element={<XVHome />} />
          <Route path="visualizer" element={<XVVisualizer />} />
          <Route path="generator" element={<XVGenerator />} />
          <Route path="products" element={<XVProducts />} />
          <Route path="colors" element={<XVColorCharts />} />
          <Route path="leads" element={<XVLeads />} />
          <Route path="leads/:id" element={<XVLeadDetail />} />
          <Route path="crm" element={<XVCRM />} />
          <Route path="lead-generator" element={<XVLeadGenerator />} />
          <Route path="systems" element={<XVSystems />} />
          <Route path="pricing" element={<XVPricing />} />
          <Route path="competitive-pricing" element={<XVCompetitivePricing />} />
          <Route path="industry" element={<XVIndustryReference />} />
          <Route path="close" element={<XVClose />} />
          <Route path="email-templates" element={<XVEmailTemplates />} />
          <Route path="bid-generator" element={<XVBidGenerator />} />
          <Route path="appointments" element={<XVAppointments />} />
          <Route path="inbox" element={<XVInbox />} />
          <Route path="receipts" element={<XVReceipts />} />
          <Route path="guardrails" element={<XVGuardrails />} />
          <Route path="settings" element={<XVSettings />} />
        </Route>
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