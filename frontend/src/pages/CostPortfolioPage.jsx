// §L6 · Cost Portfolio · operator 2026-06-12 spec.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function CostPortfolioPage() {
  return (
    <SimpleListPage
      title="Cost Portfolio · Layer 6"
      icon="💰"
      subtitle="CFO's AI dashboard · cost per decision · agent · model · LLM · cloud · vendor"
      endpoint="/api/v1/eai-os/cost"
      flowActive="output"
      storageKey="cost-portfolio"
      objective="Unit economics: cost per decision / per agent / per claim / per policy. Identify ROI losers."
      todos={[
        { id: 'cp1', label: 'List cost rows from ai_cost' },
        { id: 'cp2', label: 'LLM provider comparison' },
        { id: 'cp3', label: 'Department chargeback' },
        { id: 'cp4', label: 'Forecast monthly burn' },
      ]}
      arrayKeys={['items', 'costs', 'rows', 'data']}
      cardKind="card-3"
    />
  );
}
