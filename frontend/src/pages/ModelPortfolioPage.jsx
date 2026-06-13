// §L4 · Model Portfolio · operator 2026-06-12 spec.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function ModelPortfolioPage() {
  return (
    <SimpleListPage
      title="Model Portfolio · Layer 4"
      icon="🧠"
      subtitle="Every ML / DL / LLM / vision model · accuracy · drift · cost · value"
      endpoint="/api/v1/insur/model-registry"
      flowActive="output"
      storageKey="model-portfolio"
      objective="Single source of truth for every model · status · owner · accuracy · cost · governance · ROI."
      todos={[
        { id: 'mp1', label: 'List models from model_registry' },
        { id: 'mp2', label: 'Drift heatmap (next iter)' },
        { id: 'mp3', label: 'SHAP per-model dashboard' },
        { id: 'mp4', label: 'ROI ranker' },
      ]}
      arrayKeys={['models', 'rows', 'items', 'data']}
      cardKind="card-5"
    />
  );
}
