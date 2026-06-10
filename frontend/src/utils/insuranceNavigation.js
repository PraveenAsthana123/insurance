export const CANONICAL_DOMAINS = [
  { id: 'b2c', label: 'B2C', title: 'Business-to-Consumer' },
  { id: 'b2b', label: 'B2B', title: 'Business-to-Business' },
  { id: 'b2e', label: 'B2E', title: 'Business-to-Employee' },
];

const DOMAIN_ALIASES = {
  b2c: 'b2c',
  'b 2 c': 'b2c',
  consumer: 'b2c',
  customer: 'b2c',
  'business to consumer': 'b2c',
  'business-to-consumer': 'b2c',
  'mobile app': 'b2c',
  portal: 'b2c',
  'call center': 'b2c',
  email: 'b2c',
  chatbot: 'b2c',

  b2b: 'b2b',
  'b 2 b': 'b2b',
  broker: 'b2b',
  agency: 'b2b',
  partner: 'b2b',
  intermediary: 'b2b',
  'business to business': 'b2b',
  'business-to-business': 'b2b',

  b2e: 'b2e',
  'b 2 e': 'b2e',
  employee: 'b2e',
  workforce: 'b2e',
  internal: 'b2e',
  hr: 'b2e',
  'business to employee': 'b2e',
  'business-to-employee': 'b2e',
};

export function slugOf(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function canonicalDomainId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return DOMAIN_ALIASES[normalized] || '';
}

export function domainMeta(value) {
  const id = canonicalDomainId(value);
  return CANONICAL_DOMAINS.find((domain) => domain.id === id) || null;
}

export function scenarioForDomain(dept, domain) {
  const meta = domainMeta(domain);
  if (!meta) return null;
  const scenarios = dept?.channel_scenarios || {};
  return scenarios[meta.id] || scenarios[meta.label] || null;
}

export function availableDomainIdsForDept(dept) {
  const ids = CANONICAL_DOMAINS
    .map((domain) => domain.id)
    .filter((id) => scenarioForDomain(dept, id));
  return ids.length > 0 ? ids : CANONICAL_DOMAINS.map((domain) => domain.id);
}

export function domainsForProcess(process, dept) {
  const explicit = process?.channels || process?.domains || process?.business_domains || process?.audiences;
  if (Array.isArray(explicit) && explicit.length > 0) {
    const ids = explicit
      .map(canonicalDomainId)
      .filter(Boolean);
    return Array.from(new Set(ids));
  }
  return availableDomainIdsForDept(dept);
}

export function processAppliesToDomain(process, dept, domain) {
  const id = canonicalDomainId(domain);
  return !!id && domainsForProcess(process, dept).includes(id);
}

export function processesForDomain(processes, dept, domain) {
  return (processes || []).filter((process) => processAppliesToDomain(process, dept, domain));
}

export function aiCapabilitiesOf(process) {
  const ai = Array.isArray(process?.ai) ? process.ai : [];
  return ai.map((entry, index) => {
    const label = entry?.ai_type || entry?.name || entry?.label || `AI #${index + 1}`;
    return {
      id: slugOf(label) || `ai-${index + 1}`,
      label,
      kind: 'ai',
    };
  });
}
