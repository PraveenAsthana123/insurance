// §F13 · Dataset Upload · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function DatasetUploadPage() {
  return (
    <SimpleListPage
      title="Datasets"
      icon="📦"
      subtitle="Registered datasets · schema · row count · last updated"
      endpoint="/api/v1/datasets"
      flowActive="input"
      storageKey="datasets"
      objective="Browse every registered dataset · trigger upload (next iter)."
      todos={[
        { id: 'ds1', label: 'List existing datasets' },
        { id: 'ds2', label: 'Upload new dataset (multipart) (next iter)' },
        { id: 'ds3', label: 'Schema validator before upload' },
        { id: 'ds4', label: 'Auto-create train/val/test splits' },
      ]}
      arrayKeys={['datasets', 'items', 'data', 'rows']}
      cardKind="card-6"
    />
  );
}
