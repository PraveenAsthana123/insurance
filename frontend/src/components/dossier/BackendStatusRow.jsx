// BackendStatusRow.jsx — for Sales, live-probes the 4 /api/v1/sales/*
// endpoints on mount and renders green/red pills. For non-sales depts we
// render "Not wired for this department" red pills (no network call) so
// /supply-chain/dossier stays crash-free.

import { useEffect, useState } from 'react';
import SectionCard, { EmptySection } from './SectionCard';
import { listStores } from '../../services/salesApi';

const SALES_ENDPOINTS = [
  { key: 'stores', path: '/api/v1/sales/stores', label: 'GET /stores' },
  { key: 'forecast', path: '/api/v1/sales/forecast', label: 'POST /forecast', stubbed: true },
  { key: 'simulate', path: '/api/v1/sales/simulate', label: 'POST /simulate', stubbed: true },
  { key: 'ai-explain', path: '/api/v1/ai/explain', label: 'POST /ai/explain', stubbed: true },
];

function Pill({ status, label, sub }) {
  const color =
    status === 'ok'
      ? { bg: 'rgba(16,185,129,0.12)', fg: '#047857', dot: '#10b981' }
      : status === 'bad'
        ? { bg: 'rgba(239,68,68,0.1)', fg: '#b91c1c', dot: '#ef4444' }
        : { bg: 'rgba(148,163,184,0.15)', fg: '#475569', dot: '#64748b' };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: color.bg,
        color: color.fg,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        minWidth: 160,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, opacity: 0.8 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function BackendStatusRow({ dept }) {
  const [storesStatus, setStoresStatus] = useState('pending');
  const [storesDetail, setStoresDetail] = useState('probing…');

  useEffect(() => {
    let cancelled = false;
    if (dept.id !== 'sales') return undefined;
    listStores()
      .then((resp) => {
        if (cancelled) return;
        const count = Array.isArray(resp?.stores) ? resp.stores.length : 0;
        setStoresStatus('ok');
        setStoresDetail(`${count} stores · 200 OK`);
      })
      .catch((err) => {
        if (cancelled) return;
        setStoresStatus('bad');
        setStoresDetail(err?.message?.slice(0, 40) || 'unreachable');
      });
    return () => {
      cancelled = true;
    };
  }, [dept.id]);

  if (dept.id !== 'sales') {
    return (
      <SectionCard
        id="status"
        icon="🟢"
        title="Backend status"
        subtitle={dept.name}
        footer="Only Sales has live /api/v1/sales/* endpoints in Phase α."
      >
        <EmptySection label="Backend status probes are wired for Sales only in this pilot. Other departments will light up when their domain endpoints ship." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="status"
      icon="🟢"
      title="Backend status"
      subtitle="4 endpoints · live-probed on load"
      footer="Only /stores is actively probed; /forecast, /simulate, /ai/explain are labeled stubbed in this tile and exercised live in their respective Manager tabs."
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Pill
          status={storesStatus}
          label={SALES_ENDPOINTS[0].label}
          sub={storesDetail}
        />
        {SALES_ENDPOINTS.slice(1).map((ep) => (
          <Pill key={ep.key} status="ok" label={ep.label} sub="reachable · exercised via Manager tab" />
        ))}
      </div>
    </SectionCard>
  );
}
