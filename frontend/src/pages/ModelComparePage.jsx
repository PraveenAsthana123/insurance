// §F09 · Model Comparison · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function ModelComparePage() {
  return (
    <SimpleListPage
      title="Model Comparison"
      icon="🆚"
      subtitle="Side-by-side eval · accuracy · latency · cost per model"
      endpoint="/api/v1/insur/evals"
      flowActive="output"
      storageKey="model-compare"
      objective="See every eval run · compare any 2-3 models side-by-side · pick the winner per task."
      todos={[
        { id: 'mc1', label: 'List all eval runs' },
        { id: 'mc2', label: 'Side-by-side compare (next iter)' },
        { id: 'mc3', label: 'Per-task winner table' },
        { id: 'mc4', label: 'Export to ADR template' },
      ]}
      arrayKeys={['evals', 'runs', 'rows', 'items', 'data']}
      cardKind="card-5"
    />
  );
}
