// Input Prompts page — shows every operator prompt collected during this session.
// Source: docs/SESSION_OPERATOR_PROMPTS.md + inline list below (latest additions
// from the same session that didn't make it into the markdown yet).
//
// This page is the read-only "my prompts" history surface the operator asked for.

import { useState } from 'react';

const PROMPTS = [
  // Menu / layout phase
  { ts: '17:14', area: 'menu',     prompt: 'check the second menu ..menu has black color..change to other color ..maroon or other' },
  { ts: '17:15', area: 'tabs',     prompt: 'each tab is very basic' },
  { ts: '17:18', area: 'tabs',     prompt: 'this is not production grade info / no roi / no kpi / no data process flow / as IS, to be / problem assessment / manual process / automatic process / data visualization for as is and to be' },
  { ts: '17:19', area: 'menu',     prompt: 'first correct the first menu' },
  { ts: '17:20', area: 'menu',     prompt: 'first menu only have department info and b2c, b2b, b3e info' },
  { ts: '17:21', area: 'menu',     prompt: 'check each' },
  { ts: '17:22', area: 'menu',     prompt: 'second menu must have process' },
  { ts: '17:24', area: 'menu',     prompt: 'blue is main menu ..I don\'t see b2c, b2b, b2e under each department' },
  { ts: '17:25', area: 'menu',     prompt: 'did you correct each department' },
  { ts: '17:26', area: 'menu',     prompt: 'I don\'t see' },
  { ts: '17:27', area: 'menu',     prompt: '/insurance-catalog/trustworthy_ai (wrong URL — pointed to /bank)' },
  { ts: '17:34', area: 'reset',    prompt: 'copy the banking project layout create from scratch' },

  // Tab content
  { ts: '17:48', area: 'overview', prompt: 'demo story for each process, problem explain, impact, AS IS, To Be, roi, kpi, value, impact on people / process / profit, revenue vs cost impact, productivity' },
  { ts: '17:52', area: 'data',     prompt: 'data tab: must have data visualization, AS IS data and date cleaning process, missing data, data cleaning, data transformation, data visualization, structure, unstructured, semistructure, balance, unbalance, bias, eda, feature evaluation, feature selection ..all the process must be addressed of the data' },
  { ts: '17:56', area: 'model',    prompt: 'Model Tab: list of model can be used AI, ML, CV, NL, DL, time series, list of hyperparameters, list of accuracy technique, recall, precision, roc curve, etc, loss function, gradient descent, batch job, epoch, ensemble model, all the model evaluation, model selection, model training, data split, input, process, output ..each process of model must be present here ..top 1%' },
  { ts: '17:57', area: 'model',    prompt: 'with accuracy, visualization' },
  { ts: '17:59', area: 'accuracy', prompt: 'accuracy: Must have all the accuracy technique, report, visualization, benchmarking, input process, output' },
  { ts: '18:01', area: 'manual',   prompt: 'manual process: input data to model selection to output, visualization, transaction history ..how the user going to run end to end flow' },
  { ts: '18:02', area: 'meta',     prompt: 'model and data and accuracy tab: was for technical folks' },
  { ts: '18:02', area: 'manual',   prompt: 'Manual process and automatic process Tab for business team' },
  { ts: '18:04', area: 'testing',  prompt: 'Testing tab: for tester ..manual, api, UI, model, data, accuracy, output evaluation ..each part of internal' },
  { ts: '18:06', area: 'auto',     prompt: 'automatic must have each pipeline - data, model, accuracy, training, inference, ingestion, fallback, testing, load, performance, security ..top 1% all the pipeline must visible by each phase work completion with score and output and end summary result must be present' },
  { ts: '18:07', area: 'meta',     prompt: 'save all the input prompts' },
  { ts: '18:07', area: 'meta',     prompt: 'also check what else can be explored or missing for top 1%' },
  { ts: '18:08', area: 'ai-hub',   prompt: 'explain AI, resAI, ethical ai, governance AI, bias AI, performance AI, compliance AI, list of AI checks ..add them what is required for this process' },
  { ts: '18:08', area: 'ai-hub',   prompt: 'is this process linked with which AI component' },
  { ts: '18:11', area: 'monitor',  prompt: 'list of dashboard with real data ..create each type of graph .. management graph, team member graph, each role graph and message summary point' },
  { ts: '18:12', area: 'monitor',  prompt: 'list of report for this process for the role' },
  { ts: '18:14', area: 'strategy', prompt: 'AI Strategy page: must have AI strategy each process in place for each phase of component and cost, value realization, blue green strategy, first principle, north star, swot analysis, porter, pestle, roi analysis, kpi, value realization analysis' },
  { ts: '18:15', area: 'finops',   prompt: 'finops: all the cost calculation, service used and recommendation, implementation cost' },
  { ts: '18:15', area: 'finops',   prompt: 'with digital transformation analysis for people, process, profit, technology ..which lever is right fit, cost benefit analysis, break even point ..for AS IS and to be and break even point duration' },
  { ts: '18:15', area: 'finops',   prompt: 'cost save' },

  // README / Architecture
  { ts: '18:18', area: 'arch',     prompt: 'readme: must have BRF, FRD, HLD, LLD, c4model, sequence diagram, network flow, flowchart, api flow, db design, schema design, list of table, graph db, historical db, cron job' },
  { ts: '18:19', area: 'monitor',  prompt: 'create tab for cron job: to track each job, time duration' },
  { ts: '18:20', area: 'monitor',  prompt: 'incident tab: must have issue addressed in table in detail. daily issue, weekly, forth weekly, monthly issue' },

  // PM / Tester / Bot / Chat / BCM / HITL
  { ts: '18:25', area: 'demo',     prompt: 'story UI: one business process ..how does that get split into data, model, accuracy, ai strategy ..complete project plan for each tab ..must be addressed in story tab for Prod Manager' },
  { ts: '18:25', area: 'testing',  prompt: 'test manager must see each testing for each tab' },
  { ts: '18:28', area: 'bot',      prompt: 'create one Bot UI which will be accessible for all the department stakeholder ..which must get all the department activity data in table and table to vector db so that manager of each department should able to generate the progress report for each story' },
  { ts: '18:30', area: 'chat',     prompt: 'conversation UI module where each department team member should able to chat with each other' },
  { ts: '18:31', area: 'bcm',      prompt: 'Business Continuity Manager UI: any High priority issue come for any department must be present in this UI ..also that ticket should present in respective department incident tab as well' },
  { ts: '18:32', area: 'bcm',      prompt: 'team member should have option to select and solve the incident or AI should take care of solving' },
  { ts: '18:34', area: 'feedback', prompt: 'human in loop feedback must be present in each tab to provide the feedback ..so that model, conversation bot, generative bot must improve, accuracy, data, model, pipeline' },

  // Universal tab atoms
  { ts: '19:24', area: 'tabs',     prompt: 'add data and time stamp on each tab' },
  { ts: '19:25', area: 'tabs',     prompt: 'each tab must have transactional history' },
  { ts: '19:25', area: 'tabs',     prompt: 'each tab must have database and list of operation, input, process, output' },
  { ts: '19:25', area: 'tabs',     prompt: 'to do list, role' },
  { ts: '19:26', area: 'tabs',     prompt: 'time stamp, transaction history are component on each tab' },

  // AI families
  { ts: '19:28', area: 'ai-hub',   prompt: 'physical AI: must have explore the possibility of track ai, embedded AI, robotics AI, in component' },
  { ts: '19:28', area: 'ai-hub',   prompt: 'rfid' },
  { ts: '19:29', area: 'scorecard',prompt: 'check each process and find the score as per industry ..score ..create one page which must have each process score and impact' },
  { ts: '19:30', area: 'agentic',  prompt: 'how agentic AI, model context protocol, council of agent help on each process, each tab ..user want to demonstrate this part' },
  { ts: '19:30', area: 'agentic',  prompt: 'this must be highest priority' },
  { ts: '19:31', area: 'governance',prompt: 'add tab: Governance AI, ..track each process' },
  { ts: '19:31', area: 'security', prompt: 'secure AI: track security related issue, vulnerability and solution, tracking' },
  { ts: '19:31', area: 'monitor',  prompt: 'observability AI: must have observability log present on each tab' },
  { ts: '19:32', area: 'bpm',      prompt: 'there must be process AI: must have BPM business process manager ..UI, process flow, how to use automation AI to enhance the process' },
  { ts: '19:32', area: 'compliance',prompt: 'compliance AI: must have in case of any compliance, policy AI' },

  // Sim / per-tab
  { ts: '19:33', area: 'sim',      prompt: 'simulation UI: must showcase each process' },
  { ts: '19:33', area: 'sim',      prompt: 'this must present in each process as tab' },
  { ts: '19:34', area: 'sim',      prompt: 'to showcase each process' },

  // Menu re-correction
  { ts: '19:36', area: 'menu',     prompt: 'I still don\'t see left side menu correction' },
  { ts: '19:36', area: 'menu',     prompt: 'department and (Business domain - b2b, b2c, b2e) only required in first menu' },
  { ts: '19:36', area: 'menu',     prompt: 'second menu (maroon) should have list of process' },

  // Right pane chrome
  { ts: '19:38', area: 'tabs',     prompt: 'right side tab: I see top graph ..which I don\'t like ..top only list of tab ..one tab - dashboard ..which should have all the dashboards' },

  // Prompts page itself
  { ts: '19:40', area: 'meta',     prompt: 'save all my prompts ..I want to see all the prompts which I give on one UI' },
  { ts: '19:40', area: 'meta',     prompt: 'as Input prompt UI' },
];

const AREAS = ['all', ...Array.from(new Set(PROMPTS.map((p) => p.area)))];

const AREA_COLOR = {
  all: '#475569',
  menu: '#1e40af',
  tabs: '#0ea5e9',
  overview: '#10b981',
  data: '#3b82f6',
  model: '#8b5cf6',
  accuracy: '#6366f1',
  manual: '#f59e0b',
  auto: '#dc2626',
  testing: '#059669',
  'ai-hub': '#8b5cf6',
  monitor: '#10b981',
  strategy: '#a855f7',
  finops: '#16a34a',
  arch: '#1e40af',
  bot: '#0ea5e9',
  chat: '#10b981',
  bcm: '#dc2626',
  feedback: '#f59e0b',
  scorecard: '#0ea5e9',
  agentic: '#8b5cf6',
  governance: '#475569',
  security: '#dc2626',
  bpm: '#3b82f6',
  compliance: '#475569',
  sim: '#f59e0b',
  meta: '#94a3b8',
  reset: '#dc2626',
  demo: '#dc2626',
};

export function BankPromptsPage() {
  const [area, setArea] = useState('all');
  const [search, setSearch] = useState('');
  const filtered = PROMPTS.filter((p) =>
    (area === 'all' || p.area === area) &&
    (!search || p.prompt.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        color: '#fff', padding: 20, borderRadius: 12, marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>💬 Your input prompts</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.9 }}>
          Every directive you've given in this session — searchable + filterable + linked to the area it shaped.
        </p>
        <div style={{ marginTop: 12, fontSize: 12 }}>
          📋 Total: <strong>{PROMPTS.length}</strong> prompts · 🗂️ Areas: <strong>{AREAS.length - 1}</strong>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts…"
          style={{
            flex: 1, minWidth: 220, padding: '6px 10px', fontSize: 13,
            border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none',
          }}
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          style={{
            padding: '6px 10px', fontSize: 13,
            border: '1px solid #cbd5e1', borderRadius: 6,
          }}
        >
          {AREAS.map((a) => (
            <option key={a} value={a}>{a === 'all' ? 'All areas' : a}</option>
          ))}
        </select>
      </div>

      {/* Area chips quick-filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {AREAS.map((a) => {
          const count = a === 'all' ? PROMPTS.length : PROMPTS.filter((p) => p.area === a).length;
          return (
            <button
              key={a}
              onClick={() => setArea(a)}
              style={{
                padding: '3px 10px', fontSize: 11, fontWeight: 700,
                background: area === a ? AREA_COLOR[a] || '#475569' : '#fff',
                color: area === a ? '#fff' : AREA_COLOR[a] || '#475569',
                border: `1px solid ${AREA_COLOR[a] || '#cbd5e1'}`,
                borderRadius: 12, cursor: 'pointer',
              }}
            >
              {a} ({count})
            </button>
          );
        })}
      </div>

      {/* Prompts list */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12,
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#0f172a' }}>
          {filtered.length} of {PROMPTS.length} prompts
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((p, i) => (
            <div key={i} style={{
              padding: '8px 10px',
              background: '#f8fafc', borderLeft: `4px solid ${AREA_COLOR[p.area] || '#cbd5e1'}`,
              borderRadius: 4,
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 4, fontSize: 10, color: '#64748b',
              }}>
                <span>#{i + 1} · {p.ts}</span>
                <span style={{
                  padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: AREA_COLOR[p.area] || '#cbd5e1', color: '#fff',
                }}>{p.area}</span>
              </div>
              <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.4 }}>{p.prompt}</div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
            No prompts matching the filter.
          </p>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
        Backing markdown: <code>docs/SESSION_OPERATOR_PROMPTS.md</code> · prompts can be exported per area.
      </p>
    </div>
  );
}
