// §F05 · Cost Optimizer · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function CostOptimizerPage() {
  return (
    <SimpleListPage
      title="Cost Optimizer"
      icon="💰"
      subtitle="Token + dollar spend per tenant · agent · model · recommendations"
      endpoint="/api/v1/eai-os/cost?limit=200"
      flowActive="output"
      storageKey="cost-optimizer"
      objective="Surface the top 200 cost-driving requests · rule-based recommendations to cut spend."
      todos={[
        { id: 'c1', label: 'Top 200 cost rows visible' },
        { id: 'c2', label: 'Recommend prompt cache (saves 30-60%)' },
        { id: 'c3', label: 'Recommend smaller model where confidence high' },
        { id: 'c4', label: 'Forecast monthly burn vs budget (next iter)' },
      ]}
      arrayKeys={['items', 'rows', 'costs', 'cost', 'data']}
      cardKind="card-3"
    />
  );
}
