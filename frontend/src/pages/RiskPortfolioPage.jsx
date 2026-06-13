// §L5 · Risk Portfolio · operator 2026-06-12 spec.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function RiskPortfolioPage() {
  return (
    <SimpleListPage
      title="Risk Portfolio · Layer 5"
      icon="⚠️"
      subtitle="Enterprise risk register · 11 categories · heatmap · appetite · scenario"
      endpoint="/api/v1/eai-os/risk"
      flowActive="output"
      storageKey="risk-portfolio"
      objective="One register for every enterprise risk · Strategic · Financial · Operational · Compliance · Cyber · Data · AI · Model · Agent · Vendor · Catastrophe."
      todos={[
        { id: 'r1', label: 'Surface ai_risk + business risk rows' },
        { id: 'r2', label: 'Heatmap by likelihood × impact' },
        { id: 'r3', label: 'Residual after mitigation' },
        { id: 'r4', label: 'Risk appetite gauge' },
      ]}
      arrayKeys={['items', 'risks', 'rows', 'data']}
      cardKind="card-4"
    />
  );
}
