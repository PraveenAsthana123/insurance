// aiExplainApi.js — thin client for /api/v1/ai/explain.
// Uses the shared apiFetch wrapper so every call carries X-Demo-Role
// (Phase η demo-mode RBAC).
//
// The optional `corpus` argument picks which RAG corpus the backend uses.
// Defaults to 'sales'; supply-chain screens pass 'supply-chain'.

import { apiFetch } from './apiFetch';

export async function explain({ question, context, corpus }) {
  const body = { question, context };
  if (corpus) body.corpus = corpus;
  return apiFetch('/api/v1/ai/explain', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
