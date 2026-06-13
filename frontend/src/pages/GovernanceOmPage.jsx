// §EAOS-03 · Governance Operating Model · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function GovernanceOmPage() {
  return (
    <SimpleListPage
      title="Governance Operating Model"
      icon="⚖️"
      subtitle="Policies · standards · controls · approval workflows · RACI"
      endpoint="/api/v1/governance-registries"
      flowActive="process"
      storageKey="governance-om"
      objective="Single surface for every active policy + standard + control + approval workflow. Each row drills to RACI."
      todos={[
        { id: 'g1', label: 'List active policies from governance-registries' },
        { id: 'g2', label: 'Surface approval queue (approval_request rows)' },
        { id: 'g3', label: 'Add RACI matrix per policy (next iter)' },
        { id: 'g4', label: 'Quarterly review reminders' },
      ]}
      arrayKeys={['policies', 'standards', 'controls', 'registries', 'items', 'rows']}
      emptyHint="No governance rows surfaced · check /api/v1/governance-registries shape"
      cardKind="card-3"
    />
  );
}
