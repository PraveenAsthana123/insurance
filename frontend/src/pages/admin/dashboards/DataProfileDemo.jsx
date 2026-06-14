// DataProfileDemo · standalone page rendering CsvDataProfile + DataSummaryReport
//
// Operator 2026-06-14 17:09-17:25 MDT (rapid messages):
//   "data presentation before and after ...is not correct"
//   + "if data in csv formation then presentation must be csv layout"
//   + "each column, data type, attribute type, missing"
//   + "each data type must have visualization editor before and after"
//   + "list EDA graph visualization"
//   + "I don't see any graph of EDA"
//   + "bias, outlier, balance, unbalance, summary report mandatory"
//
// This page renders the CsvDataProfile component (5 view tabs:
// Summary · Before · After · Diff · Per-Column Viz) + DataSummaryReport
// (health score + KPIs + top issues + 4 mandatory analysis checklist).
//
// Per §57.7 honest: uses fixture data (10-column insurance dataset) ·
// banner explicit. Real data wiring = pass `columns` prop from backend.
import React from 'react';
import CsvDataProfile, { DataSummaryReport } from '../../../components/CsvDataProfile';
import DataPipelineProvenance from '../../../components/DataPipelineProvenance';

export function DataProfileDemo() {
  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        marginBottom: 16, padding: 14,
        background: 'linear-gradient(135deg, #fff 0%, #ecfdf5 100%)',
        border: '2px solid #16a34a', borderLeft: '6px solid #16a34a',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📋 Data Profile Demo · §64.6 Mandatory
        </div>
        <h1 style={{ margin: '4px 0 6px 0', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
          CSV-style Data Profile + EDA Graphs + Summary Report
        </h1>
        <div style={{ fontSize: 12, color: '#475569' }}>
          Per operator OP-17 (2026-06-14): each data type has its own viz editor before/after ·
          bias/outlier/balance/summary mandatory · §57.7 fixture used (10-column insurance dataset).
        </div>
      </div>

      {/* § 1 · DATA PIPELINE PROVENANCE (OP-19: where data comes from, types detected, paths, viz registry) */}
      <div style={{ marginBottom: 16 }}>
        <DataPipelineProvenance />
      </div>

      {/* § 2 · Summary Report */}
      <div style={{ marginBottom: 16 }}>
        <DataSummaryReport />
      </div>

      {/* § 3 · Full CSV Data Profile (5 view tabs · click 🎨 Per-Column Viz for AS-IS → Processed → Final Viz) */}
      <CsvDataProfile title="🔬 Column-by-column inspection · click 🎨 Per-Column Viz tab for AS-IS → Processed → Final Viz" />
    </div>
  );
}

export default DataProfileDemo;
