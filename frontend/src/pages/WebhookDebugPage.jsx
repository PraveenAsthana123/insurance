// §F15 · Webhook Receiver Debug · operator 2026-06-12.
import React from 'react';
import SimpleListPage from '../components/SimpleListPage';

export default function WebhookDebugPage() {
  return (
    <SimpleListPage
      title="Webhook Debug"
      icon="🪝"
      subtitle="Recent inbound webhooks · raw body · headers · signature status"
      endpoint="/api/v1/webhooks"
      flowActive="input"
      storageKey="webhook-debug"
      objective="See every inbound webhook · debug signature failures · replay any event."
      todos={[
        { id: 'wh1', label: 'List recent webhooks' },
        { id: 'wh2', label: 'Drill into raw body + headers (next iter)' },
        { id: 'wh3', label: 'Replay button for failed signature' },
        { id: 'wh4', label: 'Filter by source IP' },
      ]}
      arrayKeys={['webhooks', 'events', 'items', 'data']}
      cardKind="card-2"
    />
  );
}
