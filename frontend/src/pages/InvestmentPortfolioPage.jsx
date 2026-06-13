// §L7 · Investment Portfolio · operator 2026-06-12 spec.
// §57.7 honest scaffold: no investment_* tables yet.
import React from 'react';
import { Link } from 'react-router-dom';
import PageHeaderFlow from '../components/PageHeaderFlow';
import PageObjective from '../components/PageObjective';

export default function InvestmentPortfolioPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto', fontSize: 13, color: '#1f2937' }}>
      <h1 className="h-glass">💎 Investment Portfolio · Layer 7</h1>
      <div className="subtle" style={{ marginBottom: 14 }}>
        AI Capital Allocation · ROI · NPV · IRR · payback · innovation bets
      </div>

      <PageHeaderFlow active="output" />

      <PageObjective
        objective="Where should we place the next dollar to create the most enterprise value? · scaffold per §57.7 honest · investment_* tables next iter"
        storageKey="investment-portfolio"
        todos={[
          { id: 'i1', label: 'Create investment_initiative + business_case tables' },
          { id: 'i2', label: 'Surface portfolio allocation donut' },
          { id: 'i3', label: 'Value realization tracker (expected vs actual)' },
          { id: 'i4', label: 'Investment risk vs ROI matrix' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10, marginBottom: 16 }}>
        <div className="glass-card card-2">
          <div className="subtle" style={{ fontSize: 9 }}>COMMITTED CAPITAL (scaffold)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>$82M</div>
        </div>
        <div className="glass-card card-1">
          <div className="subtle" style={{ fontSize: 9 }}>EXPECTED VALUE (scaffold)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>$240M</div>
        </div>
        <div className="glass-card card-5">
          <div className="subtle" style={{ fontSize: 9 }}>PORTFOLIO ROI (scaffold)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>193%</div>
        </div>
        <div className="glass-card card-3">
          <div className="subtle" style={{ fontSize: 9 }}>AT-RISK INITIATIVES (scaffold)</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>7</div>
        </div>
      </div>

      <div className="glass-card" style={{ background: 'rgba(168,85,247,0.08)',
                                            borderLeft: '5px solid #a855f7' }}>
        <strong>ℹ️ §57.7 honest scaffold</strong>
        <div style={{ marginTop: 6, fontSize: 12 }}>
          Investment tables not yet created. Numbers above are static scaffold per operator spec ·
          will switch to live counts when <code>investment_initiative</code> + <code>business_case</code>
          tables land. See <Link to="/aeo">AEO Department</Link> for autonomous capital-allocation
          decisions surfaced via <code>enterprise_decision</code>.
        </div>
      </div>
    </div>
  );
}
