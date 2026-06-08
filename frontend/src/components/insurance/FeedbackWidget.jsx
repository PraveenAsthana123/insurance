// FeedbackWidget — per-process / per-tab feedback capture surface.
//
// Per GLOBAL_INPUT_PERSISTENCE_POLICY: input_kind=feedback is one of the
// listed kinds explicitly tracked. Captures thumbs-up/down + optional
// free-text comment. Mounted by ProcessDetailView so every tab has this surface.
//
// Non-blocking · soft-fail per rule 9. Empty submission is a no-op.

import { useState } from 'react';
import { useInputEvent } from '../../hooks/useInputEvent';

export function FeedbackWidget({ proc, dept, activeTab }) {
  const [rating, setRating] = useState(null); // 'up' | 'down' | null
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const captureInput = useInputEvent({
    source_surface: 'insurance-process-tab',
    component_id: `FeedbackWidget:${activeTab}`,
    department_id: dept?.id ? String(dept.id) : undefined,
    process_id: proc?.id || proc?.slug,
  });

  const submit = async (chosenRating) => {
    const effective = chosenRating || rating;
    if (!effective && !comment.trim()) {
      // No-op · nothing meaningful to capture
      return;
    }
    await captureInput({
      input_kind: 'feedback',
      input_name: `process_feedback:${activeTab}`,
      payload: {
        rating: effective,
        comment: comment.trim() || null,
        active_tab: activeTab,
        process_name: proc?.name,
        department_name: dept?.name,
      },
      pii_classification: 'low',
      retention_class: 'standard',
      purpose: 'process_feedback_capture',
    });
    setSent(true);
    // Reset after 2s so operator can submit again on next interaction
    setTimeout(() => {
      setSent(false);
      setRating(null);
      setComment('');
      setExpanded(false);
    }, 2000);
  };

  if (sent) {
    return (
      <div
        data-testid="feedback-widget-confirm"
        style={{
          marginTop: 16,
          padding: '10px 14px',
          border: '1px solid #16a34a',
          borderRadius: 6,
          background: '#dcfce7',
          color: '#166534',
          fontSize: 13,
        }}
      >
        ✓ Thanks — feedback recorded.
      </div>
    );
  }

  return (
    <div
      data-testid="feedback-widget"
      style={{
        marginTop: 16,
        padding: '12px 14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: 6,
        background: 'var(--surface-secondary, #f8fafc)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        <strong style={{ fontWeight: 600 }}>Feedback on this tab:</strong>
        <button
          type="button"
          aria-label="Thumbs up"
          onClick={() => { setRating('up'); submit('up'); }}
          style={{
            border: '1px solid #16a34a',
            background: rating === 'up' ? '#16a34a' : 'transparent',
            color: rating === 'up' ? '#fff' : '#16a34a',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          👍 Helpful
        </button>
        <button
          type="button"
          aria-label="Thumbs down"
          onClick={() => { setRating('down'); setExpanded(true); }}
          style={{
            border: '1px solid #dc2626',
            background: rating === 'down' ? '#dc2626' : 'transparent',
            color: rating === 'down' ? '#fff' : '#dc2626',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          👎 Needs work
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary, #64748b)',
            cursor: 'pointer',
            fontSize: 12,
            textDecoration: 'underline',
          }}
        >
          {expanded ? 'Hide comment' : 'Add comment'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <textarea
            aria-label="Feedback comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What's missing, wrong, or confusing? (optional)"
            rows={3}
            style={{
              width: '100%',
              padding: 8,
              fontSize: 13,
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: 4,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => submit(rating)}
              disabled={!rating && !comment.trim()}
              style={{
                background: '#1e40af',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 14px',
                cursor: (!rating && !comment.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!rating && !comment.trim()) ? 0.5 : 1,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Send feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackWidget;
