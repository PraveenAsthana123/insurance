import VoiceAIDemoPage from './pages/VoiceAIDemoPage';
import VoiceAICampaignPage from './pages/VoiceAICampaignPage';
import VoiceAIE2EPage from './pages/VoiceAIE2EPage';
import MarketingCampaignsPage from './pages/MarketingCampaignsPage';
import PublicCampaignPage from './pages/PublicCampaignPage';
import ContentOpsPage from './pages/ContentOpsPage';
import MarketingKPIsPage from './pages/MarketingKPIsPage';
import AIToolLandscapePage from './pages/AIToolLandscapePage';
import AutonomousAgentPage from './pages/AutonomousAgentPage';
import AutonomousDeptFrameworkPage from './pages/AutonomousDeptFrameworkPage';
import AdminAuditPage from './pages/AdminAuditPage';
import { lazy, Suspense } from 'react';
const AgenticHubPage = lazy(() => import('./components/AgenticHubPage'));
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';

// Eagerly load the small/critical pages (dashboard, dept tree) — these run on
// most navigations and avoid a spinner on first load.
import Dashboard from './pages/Dashboard';
import DepartmentPage from './pages/DepartmentPage';
import ProcessPage from './pages/ProcessPage';
import AdminPage from './pages/AdminPage';
import ManagerPage from './pages/ManagerPage';
import ManagerArchetypePage from './pages/ManagerArchetypePage';
import TesterPage from './pages/TesterPage';
import DepartmentDossierPage from './pages/DepartmentDossierPage';
import DataFlowPage from './pages/DataFlowPage';
import HolyNavPage from './pages/HolyNavPage';
import AgentSupervisorPage from './pages/AgentSupervisorPage';
import InsuranceCatalogPage from './pages/InsuranceCatalogPage';
import InsurancePage from './pages/InsurancePage';
import { InsuranceLayout } from './pages/insurance/InsuranceLayout';
import AdminFeedbackPage from './pages/AdminFeedbackPage';
import { InsuranceOverview, InsuranceDeptViewImpl, InsuranceDomainView } from './pages/insurance/InsuranceOverview';
import { ProcessDetailView } from './pages/insurance/ProcessDetailView';
import { AIDetailView } from './pages/insurance/AIDetailView';
import { AgenticReferenceView } from './pages/insurance/AgenticReferenceView';
import { BankLayout } from './pages/bank/BankLayout';
import { BankUseCasePage } from './pages/bank/BankUseCasePage';
import { BankDeptView } from './pages/bank/BankDeptView';
import { BankBotPage } from './pages/bank/BankBotPage';
import { BankChatPage } from './pages/bank/BankChatPage';
import { BankBcmPage } from './pages/bank/BankBcmPage';
import { BankScorecardPage } from './pages/bank/BankScorecardPage';
import { BankAgenticPage } from './pages/bank/BankAgenticPage';
import { BankPromptsPage } from './pages/bank/BankPromptsPage';
import { BankFrameworkPage } from './pages/bank/BankFrameworkPage';

// Lazy-load the heavy pages. ChartShowcase pulls Plotly+ECharts+Leaflet
// (~6MB of vendor JS); PhaseDetailPage pulls jspdf+html2canvas on PDF
// export. Splitting them keeps the initial bundle small.
const ChartShowcase    = lazy(() => import('./pages/ChartShowcase'));
const CatalogsPage     = lazy(() => import('./pages/CatalogsPage'));
const TenantsPage      = lazy(() => import('./pages/TenantsPage'));
const PhaseDetailPage  = lazy(() => import('./pages/PhaseDetailPage'));
const DataExplorer     = lazy(() => import('./pages/DataExplorer'));

import './styles/global.css';
import './styles/sidebar.css';
import './styles/topbar.css';
import './styles/content.css';
import './styles/cards.css';
import './styles/glass.css';  // §149.2 · glassmorphism + card palette + flow strip + objective block
import './styles/tables.css';
import './styles/tabs.css';
import './styles/charts.css';
import './styles/process.css';
import './styles/forms.css';
import './styles/insurance.css';

import ItsmPage from './pages/ItsmPage';
import EaiOsPage from './pages/EaiOsPage';
import PromptsPage from './pages/PromptsPage';
import PlatformExplorerPage from './pages/PlatformExplorerPage';
import AiTypesPage from './pages/AiTypesPage';
import ProcessesPage from './pages/ProcessesPage';
import ChatGroupPage from './pages/ChatGroupPage';
import ControlTowerPage from './pages/ControlTowerPage';
import SpeechToTextPage from './pages/SpeechToTextPage';
import TextToSpeechPage from './pages/TextToSpeechPage';
import NotificationCenterPage from './pages/NotificationCenterPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';
import WorkspaceDemoPage from './pages/WorkspaceDemoPage';
import EaosScoreboardPage from './pages/EaosScorebardPage';
import CommandCenterPage from './pages/CommandCenterPage';
import PromptOpsPage from './pages/PromptOpsPage';
import EvalOpsPage from './pages/EvalOpsPage';
import EaosDepartmentPage from './pages/EaosDepartmentPage';
import GovernanceOmPage from './pages/GovernanceOmPage';
import AgentLifecyclePage from './pages/AgentLifecyclePage';
import AuditExplorerPage from './pages/AuditExplorerPage';
import CostOptimizerPage from './pages/CostOptimizerPage';
import DriftMonitorPage from './pages/DriftMonitorPage';
import PromptPlaygroundPage from './pages/PromptPlaygroundPage';
import ModelComparePage from './pages/ModelComparePage';
import DatasetUploadPage from './pages/DatasetUploadPage';
import FineTuneUIPage from './pages/FineTuneUIPage';
import WebhookDebugPage from './pages/WebhookDebugPage';
import SseStreamPage from './pages/SseStreamPage';

function PageLoader({ label }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 120px)',
        gap: 16,
        color: '#64748b',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '4px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <div style={{ fontSize: 13 }}>{label || 'Loading…'}</div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/agentic" element={<Suspense fallback={<div>Loading…</div>}><AgenticHubPage /></Suspense>} />
          <Route path="/voice-ai-demo" element={<VoiceAIDemoPage />} />
          <Route path="/voice-ai-campaigns" element={<VoiceAICampaignPage />} />
          <Route path="/voice-ai-e2e" element={<VoiceAIE2EPage />} />
          <Route path="/marketing-campaigns" element={<MarketingCampaignsPage />} />
          <Route path="/public/survey/:campaignRef/:customerId" element={<PublicCampaignPage kind="survey" />} />
          <Route path="/public/form/:campaignRef/:customerId" element={<PublicCampaignPage kind="form" />} />
          <Route path="/content-ops" element={<ContentOpsPage />} />
          <Route path="/marketing-kpis" element={<MarketingKPIsPage />} />
          <Route path="/ai-tools" element={<AIToolLandscapePage />} />
          <Route path="/autonomous-agent" element={<AutonomousAgentPage />} />
          <Route path="/autonomous-dept-framework" element={<AutonomousDeptFrameworkPage />} />
          <Route path="/admin/audit" element={<AdminAuditPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-flow" element={<DataFlowPage />} />
          <Route path="/insur" element={<HolyNavPage />} />
          <Route path="/agent-supervisor" element={<AgentSupervisorPage />} />
          <Route path="/insurance-catalog" element={<InsuranceCatalogPage />} />
          <Route path="/insurance-catalog/:departmentId" element={<InsuranceCatalogPage />} />
          <Route path="/insurance-legacy" element={<InsurancePage />} />
          <Route path="/insurance" element={<InsuranceLayout />}>
            <Route index element={<InsuranceOverview />} />
            <Route path="reference/agentic" element={<AgenticReferenceView />} />
            <Route path=":deptId" element={<InsuranceDeptViewImpl />} />
            <Route path=":deptId/:domain" element={<InsuranceDomainView />} />
            <Route path=":deptId/:domain/:processId" element={<ProcessDetailView />} />
            <Route path=":deptId/:domain/:processId/ai/:aiType" element={<AIDetailView />} />
            <Route path=":deptId/:domain/:processId/:subProcessId" element={<ProcessDetailView />} />
            <Route path=":deptId/:domain/:processId/:subProcessId/ai/:aiType" element={<AIDetailView />} />
          </Route>

          {/* Heavy lazy-loaded pages get their own Suspense boundary so a
              navigation between them shows a per-page spinner rather than
              re-mounting the whole layout. */}
          <Route
            path="/chart-showcase"
            element={
              <Suspense fallback={<PageLoader label="Loading chart libraries…" />}>
                <ChartShowcase />
              </Suspense>
            }
          />
          <Route
            path="/catalogs"
            element={
              <Suspense fallback={<PageLoader label="Loading catalogs…" />}>
                <CatalogsPage />
              </Suspense>
            }
          />
          <Route
            path="/catalogs/:catalog/:code"
            element={
              <Suspense fallback={<PageLoader label="Loading phase…" />}>
                <PhaseDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/catalogs/:catalog/:code/:tab"
            element={
              <Suspense fallback={<PageLoader label="Loading phase…" />}>
                <PhaseDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/tenants"
            element={
              <Suspense fallback={<PageLoader label="Loading tenants…" />}>
                <TenantsPage />
              </Suspense>
            }
          />
          <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
          <Route
            path="/data-explorer"
            element={
              <Suspense fallback={<PageLoader label="Loading data explorer…" />}>
                <DataExplorer />
              </Suspense>
            }
          />

          <Route path="/insur/:departmentId" element={<HolyNavPage />} />
          <Route path="/:departmentId" element={<DepartmentPage />} />
          <Route path="/:departmentId/admin" element={<AdminPage />} />
          <Route path="/:departmentId/manager" element={<ManagerPage />} />
          <Route path="/:departmentId/manager/archetype/:archetypeId" element={<ManagerArchetypePage />} />
          <Route path="/:departmentId/tester" element={<TesterPage />} />
          <Route path="/:departmentId/dossier" element={<DepartmentDossierPage />} />
          <Route path="/:departmentId/:processId" element={<ProcessPage />} />
        </Route>

        {/* /bank takes the whole screen — only 2 menus (dark blue + maroon) — no global Layout wrapper */}
        <Route path="/bank" element={<BankLayout />}>
          <Route index element={<div style={{ padding: 24, color: '#64748b' }}>Pick a department · domain · process from the dark blue menu.</div>} />
          <Route path="dept/:deptId/:domain" element={<BankDeptView />} />
          <Route path="dept/:deptId/:domain/:processId" element={<BankUseCasePage />} />
          {/* 4-level: AI capability drill-down within a process. */}
          <Route path="dept/:deptId/:domain/:processId/:subProcessId" element={<BankUseCasePage />} />
          <Route path="uc/:deptId/:processId" element={<BankUseCasePage />} />
          <Route path="bot" element={<BankBotPage />} />
          <Route path="chat" element={<BankChatPage />} />
          <Route path="bcm" element={<BankBcmPage />} />
          <Route path="scorecard" element={<BankScorecardPage />} />
          <Route path="agentic" element={<BankAgenticPage />} />
          <Route path="prompts" element={<BankPromptsPage />} />
          <Route path="framework" element={<BankFrameworkPage />} />
        </Route>
        <Route path="/itsm" element={<ItsmPage />} />
        <Route path="/eai-os" element={<EaiOsPage />} />
        <Route path="/prompts" element={<PromptsPage />} />
        <Route path="/prompt-history" element={<PromptsPage />} />
        <Route path="/platform" element={<PlatformExplorerPage />} />
        <Route path="/explorer" element={<PlatformExplorerPage />} />
        <Route path="/all" element={<PlatformExplorerPage />} />
        <Route path="/ai-types" element={<AiTypesPage />} />
        <Route path="/ai-taxonomy" element={<AiTypesPage />} />
        <Route path="/types" element={<AiTypesPage />} />
        <Route path="/processes" element={<ProcessesPage />} />
        <Route path="/health/processes" element={<ProcessesPage />} />
        <Route path="/chatgroup" element={<ChatGroupPage />} />
        <Route path="/control-tower" element={<ControlTowerPage />} />
        <Route path="/stt" element={<SpeechToTextPage />} />
        <Route path="/speech-to-text" element={<SpeechToTextPage />} />
        <Route path="/tts" element={<TextToSpeechPage />} />
        <Route path="/text-to-speech" element={<TextToSpeechPage />} />
        <Route path="/notifications" element={<NotificationCenterPage />} />
        <Route path="/notification-center" element={<NotificationCenterPage />} />
        <Route path="/feature-flags" element={<FeatureFlagsPage />} />
        <Route path="/flags" element={<FeatureFlagsPage />} />
        <Route path="/workspace-demo" element={<WorkspaceDemoPage />} />
        <Route path="/layout-demo" element={<WorkspaceDemoPage />} />
        <Route path="/eaos" element={<EaosScoreboardPage />} />
        <Route path="/eaos-top10" element={<EaosScoreboardPage />} />
        <Route path="/command-center" element={<CommandCenterPage />} />
        <Route path="/promptops" element={<PromptOpsPage />} />
        <Route path="/prompt-ops" element={<PromptOpsPage />} />
        <Route path="/evalops" element={<EvalOpsPage />} />
        <Route path="/eval-ops" element={<EvalOpsPage />} />
        <Route path="/eaos-dept" element={<EaosDepartmentPage />} />
        <Route path="/eaos-department" element={<EaosDepartmentPage />} />
        <Route path="/governance-om" element={<GovernanceOmPage />} />
        <Route path="/agent-lifecycle" element={<AgentLifecyclePage />} />
        <Route path="/audit-explorer" element={<AuditExplorerPage />} />
        <Route path="/cost" element={<CostOptimizerPage />} />
        <Route path="/cost-optimizer" element={<CostOptimizerPage />} />
        <Route path="/drift" element={<DriftMonitorPage />} />
        <Route path="/drift-monitor" element={<DriftMonitorPage />} />
        <Route path="/prompt-playground" element={<PromptPlaygroundPage />} />
        <Route path="/model-compare" element={<ModelComparePage />} />
        <Route path="/datasets" element={<DatasetUploadPage />} />
        <Route path="/dataset-upload" element={<DatasetUploadPage />} />
        <Route path="/finetune" element={<FineTuneUIPage />} />
        <Route path="/fine-tune" element={<FineTuneUIPage />} />
        <Route path="/webhook-debug" element={<WebhookDebugPage />} />
        <Route path="/webhooks" element={<WebhookDebugPage />} />
        <Route path="/sse-stream" element={<SseStreamPage />} />
      </Routes>
    </BrowserRouter>
  );
}
