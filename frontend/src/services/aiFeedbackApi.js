// aiFeedbackApi.js — thin client for /api/v1/ai/feedback.
//
// Called from ExplainDrawer when a user clicks the 👍 or 👎 button after
// receiving an AI response. The correlation_id is what the backend
// emitted on the original /explain call (surfaced via ExplainResponse).
//
// Endpoint returns 204 No Content; callers should treat any thrown error
// as a best-effort failure (feedback is optional telemetry, not load-bearing).

import { apiFetch } from './apiFetch';

export async function submitFeedback({ correlationId, rating, excerpt, comment }) {
  return apiFetch('/api/v1/ai/feedback', {
    method: 'POST',
    body: JSON.stringify({
      correlation_id: correlationId,
      rating,
      response_excerpt: excerpt ?? null,
      comment: comment ?? null,
    }),
  });
}
