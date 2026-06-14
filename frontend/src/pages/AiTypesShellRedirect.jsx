// AiTypesShellRedirect · enforce "every UI page must have Main Menu + Sub Menu"
//
// Operator 2026-06-14 18:09-18:12 MDT (4-message stack):
//   "http://localhost:3210/ai-types?domain=b2c"
//   + "this is not correct ...each UI page must have Main menu and Sub Menu"
//   + "only content /workspace ...area"
//   + "should have the UI"
//
// The standalone /ai-types and /ai-taxonomy routes renderer bypasses the
// bank shell · no Main Menu · no Sub Menu · violates OP-2 + OP-9 contract.
//
// Per §73 (17-tab right pane) + §138 (operator contracts): every page with
// AI types content MUST render INSIDE the bank shell · which keeps Main
// Menu (B2C/B2B/B2E + dept + process) + Sub Menu (operation links) mounted.
//
// This redirect preserves query params (?domain=b2c stays through):
//   /ai-types?domain=b2c   → /bank/workspace?module=ai-types&domain=b2c
//   /ai-taxonomy?domain=b2b → /bank/workspace?module=ai-types&domain=b2b
//
// Composes with: §43 (drill enforces no orphan route) · §57.7 (route
// redirect is honest scaffold · not silent break) · §73 (every page in
// shell) · §138 (operator stack 1:1).
import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

export function AiTypesShellRedirect() {
  const [searchParams] = useSearchParams();
  // Preserve all query params · prepend module=ai-types
  const params = new URLSearchParams(searchParams);
  // Ensure module param is set (don't override if caller passed it explicitly)
  if (!params.has('module')) {
    params.set('module', 'ai-types');
  }
  const target = `/bank/workspace?${params.toString()}`;
  return <Navigate to={target} replace />;
}

export default AiTypesShellRedirect;
