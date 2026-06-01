// chartShowcaseData.js — Realistic insurerage data for the ChartShowcase page.
// All data is mock but shaped like real CPG/insurerage analytics surfaces.

// 1) Pie / Donut — Market share by brand family
export const marketShareData = [
  { name: 'HOLY Original', value: 38, color: '#3b82f6' },
  { name: 'HOLY Zero Sugar', value: 22, color: '#10b981' },
  { name: 'HOLY Energy', value: 18, color: '#f59e0b' },
  { name: 'HOLY Hydrate', value: 14, color: '#ef4444' },
  { name: 'HOLY Sparkling', value: 8, color: '#8b5cf6' },
];

// 2) Bar — Weekly sales by SKU
export const weeklySkuSales = [
  { sku: 'HOLY-355ml', cases: 45200, target: 42000 },
  { sku: 'HOLY-500ml', cases: 38900, target: 40000 },
  { sku: 'HOLY-1L',    cases: 27400, target: 28000 },
  { sku: 'HOLY-2L',    cases: 18700, target: 20000 },
  { sku: 'HOLY-12pk',  cases: 31200, target: 30000 },
  { sku: 'HOLY-24pk',  cases: 22800, target: 22000 },
];

// 3) Stacked Bar — Sales by retailer × channel
export const retailerChannelSales = [
  { retailer: 'Loblaws',       grocery: 124, convenience: 38, foodservice: 22 },
  { retailer: 'Sobeys',         grocery: 98,  convenience: 31, foodservice: 18 },
  { retailer: 'Metro',          grocery: 76,  convenience: 24, foodservice: 14 },
  { retailer: 'Walmart Canada', grocery: 142, convenience: 12, foodservice:  8 },
  { retailer: 'Costco Canada',  grocery: 168, convenience:  4, foodservice: 28 },
];

// 4) Line / Trend — 52-week demand forecast
export const weeklyDemandTrend = Array.from({ length: 52 }, (_, i) => {
  const week = i + 1;
  const seasonality = Math.sin((week / 52) * 2 * Math.PI) * 30;
  const trend = week * 0.8;
  const noise = (Math.random() - 0.5) * 15;
  const actual = 180 + seasonality + trend + noise;
  const forecast = 180 + seasonality + trend;
  return {
    week,
    actual: week <= 40 ? Math.round(actual) : null,
    forecast: Math.round(forecast),
    upperBound: Math.round(forecast + 25),
    lowerBound: Math.round(forecast - 25),
  };
});

// 5) Area — Inventory days-on-hand per DC
export const inventoryAreaData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  return {
    day,
    Toronto:   Math.round(18 + Math.sin(day / 4) * 5 + Math.random() * 3),
    Montreal:  Math.round(14 + Math.sin(day / 5) * 4 + Math.random() * 2),
    Vancouver: Math.round(22 + Math.sin(day / 3.5) * 6 + Math.random() * 3),
    Calgary:   Math.round(16 + Math.sin(day / 4.5) * 4 + Math.random() * 2),
  };
});

// 6) Radar — Plant OEE breakdown
export const plantOeeRadar = [
  { metric: 'Availability', Toronto: 92, Montreal: 88, Vancouver: 85 },
  { metric: 'Performance',  Toronto: 88, Montreal: 91, Vancouver: 82 },
  { metric: 'Quality',      Toronto: 96, Montreal: 94, Vancouver: 93 },
  { metric: 'Throughput',   Toronto: 85, Montreal: 82, Vancouver: 78 },
  { metric: 'Changeover',   Toronto: 79, Montreal: 86, Vancouver: 74 },
  { metric: 'Safety',       Toronto: 94, Montreal: 96, Vancouver: 91 },
];

// 7) Scatter — Price vs lift per promotion
export const promoScatterData = Array.from({ length: 40 }, () => {
  const discount = Math.random() * 30 + 5;
  const baseLift = discount * 4;
  const cannibalisation = Math.random() * 15;
  const lift = baseLift - cannibalisation + (Math.random() * 10);
  return {
    discount: parseFloat(discount.toFixed(1)),
    lift: parseFloat(lift.toFixed(1)),
    spend: Math.round(20000 + Math.random() * 80000),
  };
});

// 8) Heatmap — QC vision-system defect rate by line × shift
export const heatmapData = (() => {
  const lines = ['Line-1', 'Line-2', 'Line-3', 'Line-4', 'Line-5'];
  const shifts = ['00–08', '08–16', '16–24'];
  const out = [];
  lines.forEach((line) => {
    shifts.forEach((shift) => {
      out.push({
        line,
        shift,
        defectRate: parseFloat((Math.random() * 4).toFixed(2)),
      });
    });
  });
  return out;
})();

// 9) Treemap — Cost decomposition (COGS)
export const cogsTreemap = {
  name: 'COGS',
  children: [
    {
      name: 'Ingredients',
      children: [
        { name: 'Water',     value: 8 },
        { name: 'Sugar',     value: 22 },
        { name: 'Flavour',   value: 14 },
        { name: 'Additives', value: 6 },
      ],
    },
    {
      name: 'Packaging',
      children: [
        { name: 'PET Resin',  value: 18 },
        { name: 'Aluminium',  value: 12 },
        { name: 'Labels',     value: 4 },
        { name: 'Closures',   value: 5 },
        { name: 'Cartons',    value: 7 },
      ],
    },
    {
      name: 'Logistics',
      children: [
        { name: 'Inbound',  value: 6 },
        { name: 'Outbound', value: 11 },
        { name: 'Cold-chain', value: 3 },
      ],
    },
    {
      name: 'Labour',
      children: [
        { name: 'Plant',      value: 14 },
        { name: 'Warehouse',  value: 5 },
      ],
    },
  ],
};

// 10) Sankey — Supplier → plant → DC → retailer flow
export const sankeyData = {
  nodes: [
    { name: 'Sugar Supplier A' },
    { name: 'Sugar Supplier B' },
    { name: 'PET Supplier' },
    { name: 'Plant Toronto' },
    { name: 'Plant Montreal' },
    { name: 'DC Central' },
    { name: 'DC East' },
    { name: 'DC West' },
    { name: 'Loblaws' },
    { name: 'Sobeys' },
    { name: 'Walmart' },
  ],
  links: [
    { source: 0, target: 3, value: 80 },
    { source: 0, target: 4, value: 60 },
    { source: 1, target: 3, value: 40 },
    { source: 2, target: 3, value: 100 },
    { source: 2, target: 4, value: 90 },
    { source: 3, target: 5, value: 110 },
    { source: 3, target: 6, value: 70 },
    { source: 4, target: 7, value: 80 },
    { source: 4, target: 5, value: 70 },
    { source: 5, target: 8, value: 90 },
    { source: 5, target: 9, value: 90 },
    { source: 6, target: 10, value: 70 },
    { source: 7, target: 8, value: 50 },
    { source: 7, target: 10, value: 30 },
  ],
};

// 11) Gauge — OEE current vs target
export const oeeGauge = { value: 86.4, target: 90 };

// 12) Wordcloud — Top consumer complaint themes (NLP)
export const consumerComplaintWords = [
  { text: 'fizz',       value: 64 },
  { text: 'sweet',      value: 58 },
  { text: 'leak',       value: 52 },
  { text: 'label',      value: 47 },
  { text: 'cold',       value: 43 },
  { text: 'flat',       value: 41 },
  { text: 'expired',    value: 38 },
  { text: 'cap',        value: 35 },
  { text: 'aftertaste', value: 33 },
  { text: 'price',      value: 32 },
  { text: 'packaging',  value: 31 },
  { text: 'size',       value: 28 },
  { text: 'allergen',   value: 27 },
  { text: 'plastic',    value: 25 },
  { text: 'recycle',    value: 24 },
  { text: 'taste',      value: 23 },
  { text: 'odour',      value: 22 },
  { text: 'colour',     value: 21 },
  { text: 'bubbles',    value: 20 },
  { text: 'organic',    value: 19 },
  { text: 'caffeine',   value: 18 },
  { text: 'natural',    value: 17 },
  { text: 'sugar',      value: 16 },
  { text: 'healthy',    value: 15 },
  { text: 'energy',     value: 14 },
];

// 13) Geo — Canadian distribution centres
export const distributionCentres = [
  { city: 'Toronto',   lat: 43.6532, lng: -79.3832, throughput: 2400 },
  { city: 'Montreal',  lat: 45.5017, lng: -73.5673, throughput: 1900 },
  { city: 'Vancouver', lat: 49.2827, lng: -123.1207, throughput: 1600 },
  { city: 'Calgary',   lat: 51.0447, lng: -114.0719, throughput: 1100 },
  { city: 'Edmonton',  lat: 53.5461, lng: -113.4938, throughput: 900 },
  { city: 'Winnipeg',  lat: 49.8951, lng: -97.1384, throughput: 700 },
  { city: 'Halifax',   lat: 44.6488, lng: -63.5752, throughput: 550 },
  { city: 'Ottawa',    lat: 45.4215, lng: -75.6972, throughput: 850 },
];

// 14) Funnel — Promo conversion funnel
export const promoFunnel = [
  { stage: 'Impressions',   value: 5_400_000 },
  { stage: 'Engagements',   value: 1_080_000 },
  { stage: 'Clicks',        value:   216_000 },
  { stage: 'Cart adds',     value:    43_200 },
  { stage: 'Purchases',     value:    12_960 },
];

// 15) Waterfall — Margin decomposition
export const waterfallData = [
  { name: 'Gross Revenue',     value: 100,  type: 'start' },
  { name: 'Trade Spend',       value: -18,  type: 'negative' },
  { name: 'Net Revenue',       value: 82,   type: 'subtotal' },
  { name: 'COGS',              value: -42,  type: 'negative' },
  { name: 'Gross Margin',      value: 40,   type: 'subtotal' },
  { name: 'Marketing',         value: -9,   type: 'negative' },
  { name: 'Distribution',      value: -7,   type: 'negative' },
  { name: 'Overhead',          value: -6,   type: 'negative' },
  { name: 'Operating Margin',  value: 18,   type: 'end' },
];

// 16) Box / Violin — Forecast MAPE distribution per SKU family
export const mapeBoxPlot = (() => {
  const families = ['Original', 'Zero Sugar', 'Energy', 'Hydrate', 'Sparkling'];
  return families.map((family) => {
    const samples = Array.from({ length: 30 }, () => parseFloat((4 + Math.random() * 12).toFixed(2)));
    samples.sort((a, b) => a - b);
    return {
      family,
      samples,
      min:    samples[0],
      q1:     samples[Math.floor(samples.length * 0.25)],
      median: samples[Math.floor(samples.length * 0.5)],
      q3:     samples[Math.floor(samples.length * 0.75)],
      max:    samples[samples.length - 1],
      mean:   parseFloat((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2)),
    };
  });
})();
