// §F12 · Fine-tune UI · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function FineTuneUIPage() {
  return (
    <SimpleListPage
      title="Fine-tune Jobs"
      icon="🛠"
      subtitle="LoRA / QLoRA / full · job queue · GPU usage · checkpoint diff"
      endpoint="/api/v1/finetune"
      flowActive="process"
      storageKey="finetune"
      objective="Surface every fine-tune job · kick off new (next iter) · roll back to any checkpoint."
      todos={[
        { id: 'ft1', label: 'List all fine-tune jobs' },
        { id: 'ft2', label: 'New-job form (next iter)' },
        { id: 'ft3', label: 'GPU utilization sparkline' },
        { id: 'ft4', label: 'Per-checkpoint accuracy diff' },
      ]}
      arrayKeys={['jobs', 'finetunes', 'items', 'data']}
      cardKind="card-7"
    />
  );
}
