// §F06 · Drift Monitor · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function DriftMonitorPage() {
  return (
    <SimpleListPage
      title="Drift Monitor"
      icon="📉"
      subtitle="Per-model drift signals · PSI · KS · accuracy delta"
      endpoint="/api/v1/insur/monitoring/_global"
      flowActive="output"
      storageKey="drift-monitor"
      objective="Surface every model running in production · flag any with PSI > 0.2 or accuracy drop > 5%."
      todos={[
        { id: 'd1', label: 'List every monitored model' },
        { id: 'd2', label: 'PSI trend per model (next iter)' },
        { id: 'd3', label: 'Auto-create retrain ticket when PSI > 0.2' },
        { id: 'd4', label: 'Weekly drift digest email' },
      ]}
      arrayKeys={['models', 'pipelines', 'data', 'rows', 'monitoring']}
      cardKind="card-4"
    />
  );
}
