# Odysseus AI · Manual Process (AS-IS)

## Step-by-step (human triage workflow before Odysseus)

1. **Intake** · clerk reads request payload (4 min)
2. **Skill match** · clerk consults agent directory spreadsheet (8 min)
3. **Trigger match** · clerk reviews 27-agent runbook (12 min)
4. **Routing decision** · clerk picks 1-3 candidates (5 min)
5. **Supervisor approval** · sup confirms or vetoes (10 min)
6. **Dispatch** · clerk pastes payload into chosen agent queue (3 min)
7. **Misroute recovery** · ~25% bounce back, re-dispatched (avg 30 min)

**Total**: ~42 min/request without bounce · ~72 min with bounce
**Actor**: 2 humans (clerk + supervisor) · **Cost**: $48/case
**Misroute rate**: 25%

§139 manual process · REAL pain points from triage interview 2026-06-08
