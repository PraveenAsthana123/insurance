// lifecycles.js — blueprint lifecycle state machines per major entity.
// Consumed by LifecyclesTab to render a per-entity state flow. Purely
// declarative — no state tracking happens here; real transitions live
// in the various domain services.

export const LIFECYCLES = [
  {
    entity: 'Task',
    states: ['created', 'assigned', 'in-progress', 'blocked', 'completed', 'closed'],
    transitions: [
      ['created', 'assigned'],
      ['assigned', 'in-progress'],
      ['in-progress', 'blocked'],
      ['blocked', 'in-progress'],
      ['in-progress', 'completed'],
      ['completed', 'closed'],
    ],
    description: 'Work items tracked through the Work Management hub.',
  },
  {
    entity: 'Decision',
    states: ['pending', 'recommended', 'approved', 'rejected', 'overridden'],
    transitions: [
      ['pending', 'recommended'],
      ['recommended', 'approved'],
      ['recommended', 'rejected'],
      ['recommended', 'overridden'],
    ],
    description: 'Decisions flow through AI recommendation + human approval.',
  },
  {
    entity: 'Document',
    states: ['uploaded', 'processed', 'validated', 'approved', 'archived'],
    transitions: [
      ['uploaded', 'processed'],
      ['processed', 'validated'],
      ['validated', 'approved'],
      ['approved', 'archived'],
    ],
    description: 'Documents feed RAG + extraction pipelines.',
  },
  {
    entity: 'Incident',
    states: ['open', 'triaged', 'investigating', 'resolved', 'closed'],
    transitions: [
      ['open', 'triaged'],
      ['triaged', 'investigating'],
      ['investigating', 'resolved'],
      ['resolved', 'closed'],
    ],
    description: 'Incidents drive RCA + continuity planning.',
  },
  {
    entity: 'AI Model',
    states: ['training', 'validated', 'deployed', 'monitored', 'retired'],
    transitions: [
      ['training', 'validated'],
      ['validated', 'deployed'],
      ['deployed', 'monitored'],
      ['monitored', 'retired'],
    ],
    description: 'Model registry lifecycle under Responsible-AI governance.',
  },
];
