// §F04 · Audit Log Explorer · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function AuditExplorerPage() {
  return (
    <SimpleListPage
      title="Audit Log Explorer"
      icon="📜"
      subtitle="Every action · every actor · §38.3 audit row schema"
      endpoint="/api/v1/audit-search/recent?limit=200"
      flowActive="audit"
      storageKey="audit-explorer"
      objective="Drill into the last 200 audit rows · filter by actor / action / resource · §57.7 honest no fabrication."
      todos={[
        { id: 'au1', label: 'Last 200 rows visible' },
        { id: 'au2', label: 'Filter by actor / action / resource' },
        { id: 'au3', label: 'Export to CSV (next iter)' },
        { id: 'au4', label: 'Time-range picker (next iter)' },
      ]}
      arrayKeys={['rows', 'audit_log', 'items', 'data', 'logs']}
      columns={[
        { key: 'actor', label: 'Actor' },
        { key: 'action', label: 'Action' },
        { key: 'resource', label: 'Resource' },
        { key: 'created_at', label: 'When', render: (r) => (r.created_at || r.ts || '').slice(0, 19) },
      ]}
      cardKind="card-1"
    />
  );
}
