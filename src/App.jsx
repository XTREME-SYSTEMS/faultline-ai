import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import PortalLayout from '@/components/fl/PortalLayout';
import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
// Auth pages
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
// FaultLine pages
const Home = lazy(() => import('@/pages/Home'));
const MarketingPage = lazy(() => import('@/pages/MarketingPage'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Consultation = lazy(() => import('@/pages/Consultation'));
const WebPackGallery = lazy(() => import('@/pages/WebPackGallery'));
const Store = lazy(() => import('@/pages/Store'));
const Overview = lazy(() => import('@/pages/Overview'));
const Module = lazy(() => import('@/pages/Module'));
const Admin = lazy(() => import('@/pages/Admin'));
const DriveSync = lazy(() => import('@/pages/DriveSync'));
const DiscoveryEngine = lazy(() => import('@/pages/DiscoveryEngine'));
const SetupWizard = lazy(() => import('@/pages/SetupWizard'));
const ClientSetupWizard = lazy(() => import('@/pages/ClientSetupWizard'));
const SystemClone = lazy(() => import('@/pages/SystemClone'));
const SecurityPipeline = lazy(() => import('@/pages/SecurityPipeline'));
const IndustryOpportunities = lazy(() => import('@/pages/IndustryOpportunities'));
const AiControlPanel = lazy(() => import('@/pages/AiControlPanel'));
const ClientDemoPortal = lazy(() => import('@/pages/ClientDemoPortal'));
const DeliverableStudio = lazy(() => import('@/pages/DeliverableStudio'));
const UniversalBuilder = lazy(() => import('@/pages/UniversalBuilder'));
const QADashboard = lazy(() => import('@/pages/QADashboard'));
const CommandCenter = lazy(() => import('@/pages/CommandCenter'));
const ClientROI = lazy(() => import('@/pages/ClientROI'));
const CompetitiveIntel = lazy(() => import('@/pages/CompetitiveIntel'));
const ImplementationMarketplace = lazy(() => import('@/pages/ImplementationMarketplace'));
const WhiteLabel = lazy(() => import('@/pages/WhiteLabel'));
const AuditTemplates = lazy(() => import('@/pages/AuditTemplates'));
const PartnerPortal = lazy(() => import('@/pages/PartnerPortal'));
const FinancialSync = lazy(() => import('@/pages/FinancialSync'));
const ESignature = lazy(() => import('@/pages/ESignature'));
const ESignDashboard = lazy(() => import('@/pages/esign/ESignDashboard'));
const NewEnvelope = lazy(() => import('@/pages/esign/NewEnvelope'));
const EnvelopeDetail = lazy(() => import('@/pages/esign/EnvelopeDetail'));
const SignDocument = lazy(() => import('@/pages/esign/SignDocument'));
const BooksDashboard = lazy(() => import('@/pages/books/BooksDashboard'));
const InvoiceList = lazy(() => import('@/pages/books/InvoiceList'));
const NewInvoice = lazy(() => import('@/pages/books/NewInvoice'));
const InvoiceDetail = lazy(() => import('@/pages/books/InvoiceDetail'));
const ExpenseList = lazy(() => import('@/pages/books/ExpenseList'));
const ChartOfAccounts = lazy(() => import('@/pages/books/ChartOfAccounts'));
const FinancialReports = lazy(() => import('@/pages/books/FinancialReports'));
const WebsiteGenerator = lazy(() => import('@/pages/WebsiteGenerator'));
const AppGenerator = lazy(() => import('@/pages/AppGenerator'));
const BusinessHub = lazy(() => import('@/pages/business/BusinessHub'));
const IdeaIntake = lazy(() => import('@/pages/business/IdeaIntake'));
const UniversalGenerator = lazy(() => import('@/pages/UniversalGenerator'));
const BrandGenerator = lazy(() => import('@/pages/BrandGenerator'));
const XPSCatalog = lazy(() => import('@/pages/XPSCatalog'));
const Marketplace = lazy(() => import('@/pages/Marketplace'));
const VisualMediaStudio = lazy(() => import('@/pages/VisualMediaStudio'));
const PCUMarketplace = lazy(() => import('@/pages/PCUMarketplace'));
const ToolAdvisor = lazy(() => import('@/pages/ToolAdvisor'));
const CompanyDetail = lazy(() => import('@/pages/CompanyDetail'));
const RepairBoard = lazy(() => import('@/pages/RepairBoard'));
const Chat = lazy(() => import('@/pages/Chat'));
const Trends = lazy(() => import('@/pages/Trends'));
const CustomerPortal = lazy(() => import('@/pages/CustomerPortal'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Settings = lazy(() => import('@/pages/Settings'));
const PCUControlCenter = lazy(() => import('@/pages/PCUControlCenter'));
const EnhancementEngine = lazy(() => import('@/pages/EnhancementEngine'));
const ClientProjects = lazy(() => import('@/pages/ClientProjects'));
const ClientPortal = lazy(() => import('@/pages/ClientPortal'));
const ClientFunnel = lazy(() => import('@/pages/ClientFunnel'));
const Projects = lazy(() => import('@/pages/Projects'));
const UniversalDatabase = lazy(() => import('@/pages/UniversalDatabase'));
const NicheWebsiteStudio = lazy(() => import('@/pages/NicheWebsiteStudio'));
const VideoStudio = lazy(() => import('@/pages/VideoStudio'));
const SocialMediaManager = lazy(() => import('@/pages/SocialMediaManager'));
const AiBidWriter = lazy(() => import('@/pages/tools/AiBidWriter'));
const CloneStudio = lazy(() => import('@/pages/CloneStudio'));
const CloneGallery = lazy(() => import('@/pages/CloneGallery'));
const CloneQueue = lazy(() => import('@/pages/CloneQueue'));
const XtremeOS = lazy(() => import('@/pages/XtremeOS'));
const BuildStudio = lazy(() => import('@/pages/BuildStudio'));
const SEOConsole = lazy(() => import('@/pages/SEOConsole'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const _PORTAL_TAB_PATHS = new Set(['/app', '/app/command-center', '/app/chat', '/app/business', '/app/settings']);
  const animKey = _PORTAL_TAB_PATHS.has(location.pathname) ? 'portal-tabs' : location.pathname;

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
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <motion.div key={animKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}>
    <Routes location={location}>
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
      <Route path="/consultation" element={<Consultation />} />
      <Route path="/web-packs" element={<WebPackGallery />} />
      <Route path="/store" element={<Store />} />
      <Route path="/tools/ai-bid-writer" element={<AiBidWriter />} />
      <Route path="/portal/:companyId" element={<CustomerPortal />} />
      <Route path="/funnel" element={<ClientFunnel />} />
      <Route path="/sign/:token" element={<SignDocument />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected portal */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<PortalLayout />}>
        <Route path="/app" element={<XtremeOS />} />
        <Route path="/app/build-studio" element={<BuildStudio />} />
        <Route path="/app/clone-studio" element={<CloneStudio />} />
        <Route path="/app/clone-queue" element={<CloneQueue />} />
        <Route path="/app/clone-gallery" element={<CloneGallery />} />
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
        <Route path="/app/xtremeos" element={<XtremeOS />} />
        <Route path="/app/settings" element={<Settings />} />
        <Route path="/app/pcu-control" element={<PCUControlCenter />} />
        <Route path="/app/enhancement-engine" element={<EnhancementEngine />} />
        <Route path="/app/client-projects" element={<ClientProjects />} />
        <Route path="/app/client-portal" element={<ClientPortal />} />
        <Route path="/app/projects" element={<Projects />} />
        <Route path="/app/database" element={<UniversalDatabase />} />
        <Route path="/app/niche-websites" element={<NicheWebsiteStudio />} />
        <Route path="/app/video-studio" element={<VideoStudio />} />
        <Route path="/app/social-media" element={<SocialMediaManager />} />
      <Route path="/app/seo-console" element={<SEOConsole />} />
        <Route path="/app/:slug" element={<Module />} />
        <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App