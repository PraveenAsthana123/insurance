// ComponentInfo · 1-2 liner description badge for every UI component
//
// Operator 2026-06-14 17:32 MDT: "every component must have 1 or 2 liner
// about that component ..I see this is missing in every component ..
// must prensent" + "mandatory"
//
// Per §57.7 honest + §73 per-tab uniqueness: every visible component
// should answer "what is this?" without the user reading code or guessing
// from labels. A 1-2 liner description in italics directly under the title
// makes the component self-describing.
//
// Three variants for placement flexibility:
//   <ComponentInfo title description />    · standalone block (top of section)
//   <ComponentInfoInline ... />            · single-line inline variant
//   <ComponentInfoBadge ... />             · compact info-icon with hover tooltip
//
// Composes with: §43 (drill enforces component coverage) · §57.7 (honest
// description · not marketing fluff) · §73 (per-component uniqueness ·
// what makes THIS component different) · §122 (top-1% = self-describing).
import React from 'react';

/**
 * ComponentInfo · standalone block · use at TOP of every component
 * @param {string} title - 2-5 word component name
 * @param {string} description - 1-2 sentence purpose
 * @param {string} [accent='#0891b2'] - left-border accent color
 * @param {string} [icon] - optional emoji prefix
 * @param {React.ReactNode} [children] - optional extra content
 */
export function ComponentInfo({ title, description, accent = '#0891b2', icon, children }) {
  return (
    <div style={{
      marginBottom: 10, padding: '8px 12px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${accent}`,
      borderRadius: 4,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 800, color: accent,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 2,
      }}>
        {icon ? `${icon} ` : 'ℹ '}{title}
      </div>
      <div style={{
        fontSize: 11, color: '#475569', lineHeight: 1.4, fontStyle: 'italic',
      }}>
        {description}
      </div>
      {children && <div style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}

/**
 * ComponentInfoInline · 1-line variant for tight layouts
 * Renders as small italic text under a title
 */
export function ComponentInfoInline({ description, accent = '#94a3b8' }) {
  return (
    <div style={{
      fontSize: 10, color: accent, fontStyle: 'italic',
      lineHeight: 1.4, marginTop: 2, marginBottom: 4,
    }}>
      {description}
    </div>
  );
}

/**
 * ComponentInfoBadge · compact info chip · click/hover-friendly
 * Use when space is tight (next to a title) and full description goes in title attr.
 */
export function ComponentInfoBadge({ description, accent = '#0891b2' }) {
  return (
    <span
      title={description}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, borderRadius: '50%',
        background: accent, color: '#fff',
        fontSize: 10, fontWeight: 800, cursor: 'help',
        marginLeft: 6,
      }}
    >ℹ</span>
  );
}

export default ComponentInfo;
