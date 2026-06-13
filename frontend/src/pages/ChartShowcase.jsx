// ChartShowcase.jsx — comprehensive chart-library showcase
// Demonstrates 16 chart types using realistic insurerage analytics data
// across 6 libraries: Recharts, Plotly, ECharts, D3, react-d3-cloud,
// react-leaflet. Per global §64.39 (chart vocabulary) + §22 (layout).

import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Treemap, FunnelChart, Funnel, LabelList,
} from 'recharts';
import Plot from 'react-plotly.js';
import ReactECharts from 'echarts-for-react';
import WordCloud from 'react-d3-cloud';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import {
  marketShareData,
  weeklySkuSales,
  retailerChannelSales,
  weeklyDemandTrend,
  inventoryAreaData,
  plantOeeRadar,
  promoScatterData,
  heatmapData,
  cogsTreemap,
  sankeyData,
  oeeGauge,
  consumerComplaintWords,
  distributionCentres,
  promoFunnel,
  waterfallData,
  mapeBoxPlot,
} from '../data/chartShowcaseData';

// ---- helpers ----

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];

function ChartCard({ title, subtitle, library, children, code }) {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{title}</h3>
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            background: '#f1f5f9',
            color: '#475569',
            borderRadius: 6,
            fontFamily: 'monospace',
          }}
        >
          {library}
        </span>
      </header>
      {subtitle && (
        <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#64748b' }}>{subtitle}</p>
      )}
      <div style={{ width: '100%', minHeight: 280 }}>{children}</div>
      {code && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }}>Show code</summary>
          <pre
            style={{
              fontSize: 10,
              background: '#f8fafc',
              color: '#1f2937',
              padding: 12,
              borderRadius: 6,
              overflow: 'auto',
              border: '1px solid #e5e7eb',
              margin: '6px 0 0 0',
            }}
          >
            {code}
          </pre>
        </details>
      )}
    </section>
  );
}

// ---- 1) Pie ----

function PieDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={marketShareData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, value }) => `${name} ${value}%`}
        >
          {marketShareData.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color || COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- 2) Donut ----

function DonutDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={marketShareData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {marketShareData.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color || COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- 3) Bar (with target line) ----

function BarDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={weeklySkuSales}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="sku" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="cases" fill="#3b82f6" name="Actual cases (k)" />
        <Bar dataKey="target" fill="#94a3b8" name="Target cases (k)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- 4) Stacked Bar ----

function StackedBarDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={retailerChannelSales}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="retailer" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="grocery" stackId="a" fill="#3b82f6" name="Grocery ($M)" />
        <Bar dataKey="convenience" stackId="a" fill="#10b981" name="Convenience ($M)" />
        <Bar dataKey="foodservice" stackId="a" fill="#f59e0b" name="Foodservice ($M)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- 5) Line / Trend with forecast band ----

function LineForecastDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={weeklyDemandTrend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottom', offset: -4 }} />
        <YAxis label={{ value: 'Cases (k)', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="upperBound" stroke="none" fill="#3b82f6" fillOpacity={0.12} name="95% CI Upper" />
        <Area type="monotone" dataKey="lowerBound" stroke="none" fill="#3b82f6" fillOpacity={0.12} name="95% CI Lower" />
        <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} dot={false} name="Forecast" />
        <Line type="monotone" dataKey="actual" stroke="#0f172a" strokeWidth={2} dot={false} name="Actual" />
        <ReferenceLine x={40} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Today', position: 'top', fill: '#ef4444' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---- 6) Area (multi-DC inventory) ----

function AreaDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={inventoryAreaData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -4 }} />
        <YAxis label={{ value: 'Days on Hand', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="Toronto" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
        <Area type="monotone" dataKey="Montreal" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
        <Area type="monotone" dataKey="Vancouver" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
        <Area type="monotone" dataKey="Calgary" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- 7) Radar (Plant OEE) ----

function RadarDemo() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={plantOeeRadar}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        <Radar name="Toronto" dataKey="Toronto" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
        <Radar name="Montreal" dataKey="Montreal" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
        <Radar name="Vancouver" dataKey="Vancouver" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
        <Legend />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ---- 8) Scatter (promo discount vs lift) ----

function ScatterDemo() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis type="number" dataKey="discount" name="Discount %" unit="%" />
        <YAxis type="number" dataKey="lift" name="Lift %" unit="%" />
        <ZAxis type="number" dataKey="spend" range={[20, 400]} name="Spend $" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Legend />
        <Scatter name="Promotions" data={promoScatterData} fill="#3b82f6" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ---- 9) Heatmap (ECharts — vision-QA defect rate) ----

function HeatmapDemo() {
  const lines = [...new Set(heatmapData.map((d) => d.line))];
  const shifts = [...new Set(heatmapData.map((d) => d.shift))];
  const data = heatmapData.map((d) => [shifts.indexOf(d.shift), lines.indexOf(d.line), d.defectRate]);

  const option = {
    tooltip: { position: 'top' },
    grid: { left: 80, right: 30, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: shifts, name: 'Shift' },
    yAxis: { type: 'category', data: lines, name: 'Line' },
    visualMap: {
      min: 0, max: 4,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#dcfce7', '#86efac', '#facc15', '#f97316', '#dc2626'] },
    },
    series: [{
      name: 'Defect %',
      type: 'heatmap',
      data,
      label: { show: true, formatter: '{c}%' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  };
  return <ReactECharts option={option} style={{ height: 320 }} />;
}

// ---- 10) Treemap (COGS) ----

function TreemapDemo() {
  const flat = cogsTreemap.children.flatMap((parent) =>
    parent.children.map((child) => ({ name: `${parent.name}: ${child.name}`, size: child.value }))
  );
  return (
    <ResponsiveContainer width="100%" height={320}>
      <Treemap data={flat} dataKey="size" stroke="#fff" fill="#3b82f6" content={<CustomTreemapCell />} />
    </ResponsiveContainer>
  );
}

function CustomTreemapCell({ x, y, width, height, name, size, index }) {
  const color = COLORS[index % COLORS.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" />
      {width > 70 && height > 30 && (
        <>
          <text x={x + 8} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
          <text x={x + 8} y={y + 30} fill="#fff" fontSize={10} opacity={0.8}>${size}M</text>
        </>
      )}
    </g>
  );
}

// ---- 11) Sankey (Plotly — supplier → plant → DC → retailer) ----

function SankeyDemo() {
  return (
    <Plot
      data={[{
        type: 'sankey',
        orientation: 'h',
        node: {
          pad: 12, thickness: 18, line: { color: '#cbd5e1', width: 0.5 },
          label: sankeyData.nodes.map((n) => n.name),
          color: sankeyData.nodes.map((_, i) => COLORS[i % COLORS.length]),
        },
        link: {
          source: sankeyData.links.map((l) => l.source),
          target: sankeyData.links.map((l) => l.target),
          value: sankeyData.links.map((l) => l.value),
          color: sankeyData.links.map(() => 'rgba(59,130,246,0.25)'),
        },
      }]}
      layout={{ font: { size: 11 }, margin: { l: 0, r: 0, t: 8, b: 0 }, height: 360 }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  );
}

// ---- 12) Gauge (ECharts — OEE) ----

function GaugeDemo() {
  const option = {
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      progress: { show: true, width: 18 },
      axisLine: { lineStyle: { width: 18, color: [[0.5, '#ef4444'], [0.8, '#f59e0b'], [1, '#10b981']] } },
      pointer: { length: '60%', width: 6 },
      detail: { valueAnimation: true, formatter: '{value}%', fontSize: 28, color: '#0f172a' },
      data: [{ value: oeeGauge.value, name: 'OEE' }],
    }, {
      type: 'gauge',
      startAngle: 200, endAngle: -20, min: 0, max: 100,
      axisLine: { show: false },
      progress: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      title: { show: false },
      detail: { show: false },
      data: [{ value: oeeGauge.target }],
      markPoint: {
        symbol: 'triangle',
        symbolRotate: 180,
        data: [{ coord: [oeeGauge.target], value: 'Target' }],
      },
    }],
  };
  return <ReactECharts option={option} style={{ height: 320 }} />;
}

// ---- 13) Wordcloud (react-d3-cloud — complaint themes) ----

function WordcloudDemo() {
  const fontSize = (w) => 12 + w.value * 0.6;
  return (
    <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <WordCloud
        data={consumerComplaintWords}
        font="Inter, system-ui, sans-serif"
        fontSize={fontSize}
        rotate={() => (Math.random() < 0.5 ? 0 : 90)}
        padding={4}
        width={520}
        height={320}
        fill={(d, i) => COLORS[i % COLORS.length]}
      />
    </div>
  );
}

// ---- 14) Geo map (Leaflet — Canadian DCs) ----

function GeoDemo() {
  return (
    <div style={{ height: 360, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={[55, -97]} zoom={3} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {distributionCentres.map((dc) => (
          <CircleMarker
            key={dc.city}
            center={[dc.lat, dc.lng]}
            radius={Math.sqrt(dc.throughput) / 4}
            pathOptions={{ fillColor: '#3b82f6', color: '#1e40af', fillOpacity: 0.65, weight: 1 }}
          >
            <LeafletTooltip>{dc.city}: {dc.throughput} cases/day</LeafletTooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

// ---- 15) Funnel ----

function FunnelDemo() {
  const data = promoFunnel.map((f, i) => ({ ...f, fill: COLORS[i % COLORS.length] }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <FunnelChart>
        <Tooltip />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList position="right" fill="#0f172a" stroke="none" dataKey="stage" />
          <LabelList position="left" fill="#475569" stroke="none" dataKey="value" formatter={(v) => v.toLocaleString()} />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

// ---- 16) Waterfall (custom Recharts) ----

function WaterfallDemo() {
  let runningTotal = 0;
  const data = waterfallData.map((row, i) => {
    const isTotal = row.type === 'start' || row.type === 'subtotal' || row.type === 'end';
    const base = isTotal ? 0 : runningTotal;
    const value = isTotal ? row.value : Math.abs(row.value);
    if (!isTotal) runningTotal += row.value;
    else runningTotal = row.value;
    return {
      name: row.name,
      base,
      value,
      label: row.value,
      color: row.type === 'negative' ? '#ef4444' : row.type === 'end' ? '#10b981' : '#3b82f6',
    };
  });
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} fontSize={11} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="value" stackId="a">
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={entry.color} />
          ))}
          <LabelList dataKey="label" position="top" fontSize={10} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- 17) Box plot (Plotly — Forecast MAPE per family) ----

function BoxplotDemo() {
  const data = mapeBoxPlot.map((row) => ({
    type: 'box',
    name: row.family,
    y: row.samples,
    boxpoints: 'all',
    jitter: 0.4,
    pointpos: -1.8,
    marker: { color: COLORS[mapeBoxPlot.indexOf(row) % COLORS.length] },
  }));
  return (
    <Plot
      data={data}
      layout={{
        showlegend: false,
        margin: { l: 50, r: 10, t: 10, b: 60 },
        yaxis: { title: 'MAPE (%)' },
        height: 320,
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  );
}

// ---- main page ----

export default function ChartShowcase() {
  const charts = useMemo(() => [
    { id: 'pie',       title: '1. Pie — Market Share by Brand',         subtitle: 'Categorical share of total market', library: 'Recharts', Component: PieDemo },
    { id: 'donut',     title: '2. Donut — Market Share (alt)',          subtitle: 'Pie with center hole for KPI overlay', library: 'Recharts', Component: DonutDemo },
    { id: 'bar',       title: '3. Bar — Weekly Sales by SKU',           subtitle: 'Actual vs target per SKU', library: 'Recharts', Component: BarDemo },
    { id: 'stacked',   title: '4. Stacked Bar — Sales by Retailer × Channel', subtitle: 'Channel mix per retailer ($M)', library: 'Recharts', Component: StackedBarDemo },
    { id: 'line',      title: '5. Trend — 52-Week Demand Forecast',     subtitle: 'Actual + forecast + 95% confidence band', library: 'Recharts', Component: LineForecastDemo },
    { id: 'area',      title: '6. Area — Days-on-Hand per DC',          subtitle: 'Stacked area over 30 days, 4 distribution centres', library: 'Recharts', Component: AreaDemo },
    { id: 'radar',     title: '7. Radar — Plant OEE Breakdown',         subtitle: '6-axis OEE per plant', library: 'Recharts', Component: RadarDemo },
    { id: 'scatter',   title: '8. Scatter — Promo Discount vs Lift',    subtitle: 'Bubble size = promo spend', library: 'Recharts', Component: ScatterDemo },
    { id: 'heatmap',   title: '9. Heatmap — Vision-QA Defect Rate',     subtitle: 'Line × Shift defect % (color-coded)', library: 'ECharts',  Component: HeatmapDemo },
    { id: 'treemap',   title: '10. Treemap — COGS Decomposition',       subtitle: 'Nested cost categories ($M)', library: 'Recharts', Component: TreemapDemo },
    { id: 'sankey',    title: '11. Sankey — Supply Chain Flow',         subtitle: 'Supplier → Plant → DC → Retailer (volume)', library: 'Plotly',   Component: SankeyDemo },
    { id: 'gauge',     title: '12. Gauge — OEE vs Target',              subtitle: 'Current OEE + target threshold', library: 'ECharts',  Component: GaugeDemo },
    { id: 'wordcloud', title: '13. Wordcloud — Consumer Complaint Themes', subtitle: 'NLP-extracted themes from support tickets', library: 'd3-cloud', Component: WordcloudDemo },
    { id: 'geo',       title: '14. Geo Map — Canadian Distribution Centres', subtitle: 'Bubble size = throughput', library: 'Leaflet',  Component: GeoDemo },
    { id: 'funnel',    title: '15. Funnel — Promo Conversion',          subtitle: 'Impressions → engagement → click → cart → purchase', library: 'Recharts', Component: FunnelDemo },
    { id: 'waterfall', title: '16. Waterfall — Margin Decomposition',   subtitle: 'Gross revenue → operating margin (cost stack)', library: 'Recharts', Component: WaterfallDemo },
    { id: 'boxplot',   title: '17. Box Plot — Forecast MAPE per Family',subtitle: 'Distribution across 30 weeks per brand family', library: 'Plotly',   Component: BoxplotDemo },
  ], []);

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100%' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
          Chart Library Showcase
        </h1>
        <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#64748b' }}>
          17 chart types across 6 libraries (Recharts · Plotly · ECharts · d3-cloud · Leaflet · Recharts custom).
          All using realistic insurerage analytics data per <code>docs/digital_transformation/insurerage_industry_processes.md</code>.
        </p>
        <nav style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {charts.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                color: '#475569',
                textDecoration: 'none',
              }}
            >
              {c.title.split(' — ')[0]}
            </a>
          ))}
        </nav>
      </header>

      {charts.map((c) => (
        <div id={c.id} key={c.id}>
          <ChartCard title={c.title} subtitle={c.subtitle} library={c.library}>
            <c.Component />
          </ChartCard>
        </div>
      ))}

      <footer style={{ marginTop: 32, padding: 16, fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
        <strong>Per §64.39:</strong> No single library is sufficient. Different chart families need different tools.
        Recharts for standard React charts; Plotly for scientific/interactive (sankey, boxplot, 3D);
        ECharts for big-data + gauges + heatmaps; d3-cloud for wordclouds; Leaflet for geo.
        Project must support ≥ 4 libraries — single-library lock-in is anti-pattern.
      </footer>
    </div>
  );
}
