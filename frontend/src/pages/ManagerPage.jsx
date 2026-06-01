import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { departments } from '../data/departments';
import { getArchetypesForDept } from '../data/managerArchetypes';
import KPIDashboardTab from '../components/manager-tabs/KPIDashboardTab';
import StatusHealthTab from '../components/manager-tabs/StatusHealthTab';
import ReportsTab from '../components/manager-tabs/ReportsTab';
import MonitoringAlertsTab from '../components/manager-tabs/MonitoringAlertsTab';
import TeamPerformanceTab from '../components/manager-tabs/TeamPerformanceTab';
import DataFlowTab from '../components/manager-tabs/DataFlowTab';
import RolesResponsibilitiesTab from '../components/manager-tabs/RolesResponsibilitiesTab';
import SalesForecastTab from '../components/manager-tabs/sales/ForecastTab';
import SalesRevenueDrillDownTab from '../components/manager-tabs/sales/RevenueDrillDownTab';
import SalesSimulationTab from '../components/manager-tabs/sales/SimulationTab';
import SupplyChainStockoutRiskTab from '../components/manager-tabs/supply-chain/StockoutRiskTab';
import SupplyChainSupplierScorecardTab from '../components/manager-tabs/supply-chain/SupplierScorecardTab';
import SupplyChainNetworkSimTab from '../components/manager-tabs/supply-chain/NetworkSimTab';
import MarketingCampaignROITab from '../components/manager-tabs/marketing/CampaignROITab';
import CustomerChurnRiskTab from '../components/manager-tabs/customer/ChurnRiskTab';
import FinanceBudgetVarianceTab from '../components/manager-tabs/finance/BudgetVarianceTab';

const BASE_TABS = [
  { id: 'kpi-dashboard',          label: 'KPI Dashboard',            icon: '📊', Component: KPIDashboardTab          },
  { id: 'status-health',          label: 'Status & Health',          icon: '🫀', Component: StatusHealthTab          },
  { id: 'reports',                label: 'Reports',                  icon: '📑', Component: ReportsTab               },
  { id: 'monitoring-alerts',      label: 'Monitoring & Alerts',      icon: '🚨', Component: MonitoringAlertsTab      },
  { id: 'team-performance',       label: 'Team Performance',         icon: '🏆', Component: TeamPerformanceTab       },
  { id: 'data-flow',              label: 'Cross-Dept Data Flow',     icon: '🔀', Component: DataFlowTab              },
  { id: 'roles-responsibilities', label: 'Roles & Responsibilities', icon: '🧩', Component: RolesResponsibilitiesTab },
];

const SALES_EXTRA_TABS = [
  { id: 'sales-forecast',       label: 'Forecast',        icon: '📈', Component: SalesForecastTab          },
  { id: 'sales-revenue',        label: 'Revenue Tree',    icon: '🌲', Component: SalesRevenueDrillDownTab },
  { id: 'sales-simulation',     label: 'Simulation',      icon: '🎯', Component: SalesSimulationTab        },
];

const SUPPLY_CHAIN_EXTRA_TABS = [
  { id: 'sc-stockout-risk',     label: 'Stockout Risk',       icon: '⚠️', Component: SupplyChainStockoutRiskTab      },
  { id: 'sc-supplier-scorecard', label: 'Supplier Scorecard', icon: '🏭', Component: SupplyChainSupplierScorecardTab },
  { id: 'sc-network-sim',       label: 'Network Sim',         icon: '🕸️', Component: SupplyChainNetworkSimTab        },
];

const MARKETING_EXTRA_TABS = [
  { id: 'mkt-campaign-roi',     label: 'Campaign ROI',        icon: '📣', Component: MarketingCampaignROITab         },
];

const CUSTOMER_EXTRA_TABS = [
  { id: 'cust-churn-risk',      label: 'Churn Risk',          icon: '⚡', Component: CustomerChurnRiskTab            },
];

const FINANCE_EXTRA_TABS = [
  { id: 'fin-budget-variance',  label: 'Budget Variance',     icon: '💰', Component: FinanceBudgetVarianceTab        },
];

function tabsForDept(deptId) {
  if (deptId === 'sales') return [...BASE_TABS, ...SALES_EXTRA_TABS];
  if (deptId === 'supply-chain') return [...BASE_TABS, ...SUPPLY_CHAIN_EXTRA_TABS];
  if (deptId === 'marketing') return [...BASE_TABS, ...MARKETING_EXTRA_TABS];
  if (deptId === 'customer') return [...BASE_TABS, ...CUSTOMER_EXTRA_TABS];
  if (deptId === 'finance') return [...BASE_TABS, ...FINANCE_EXTRA_TABS];
  return BASE_TABS;
}

export default function ManagerPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kpi-dashboard');
  const dept = departments.find((d) => d.id === departmentId);
  if (!dept || dept.id === 'dashboard') return <Navigate to="/" replace />;

  const TABS = tabsForDept(dept.id);
  const Active = TABS.find((t) => t.id === activeTab).Component;
  const archetypes = getArchetypesForDept(dept.id);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">📊 {dept.name} — Manager</div>
          <div className="page-subtitle">KPIs, reports, monitoring, team performance for the {dept.name} department</div>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {archetypes.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                📋 Switch archetype
              </span>
              <select
                aria-label="Switch manager archetype"
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) navigate(`/${dept.id}/manager/archetype/${id}`);
                }}
                style={{
                  padding: '6px 10px', fontSize: 12, borderRadius: 6,
                  border: '1px solid #e2e8f0', background: '#fff',
                  color: '#0f172a', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="">(none)</option>
                {archetypes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span style={{
            padding: '6px 16px', borderRadius: 'var(--border-radius-lg)',
            background: `${dept.color}15`, border: `1px solid ${dept.color}33`,
            color: dept.color, fontSize: 'var(--font-size-sm)', fontWeight: 600,
          }}>
            {dept.icon} {dept.name}
          </span>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-item-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tab-content">
          <div className="tab-panel active has-padding">
            <Active dept={dept} />
          </div>
        </div>
      </div>
    </div>
  );
}
