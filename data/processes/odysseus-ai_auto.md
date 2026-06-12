# Odysseus AI · Automatic Process (TO-BE)

## Agent pipeline

1. **Intake agent** · validates payload schema · 30ms
2. **Prompt-injection gate** (§113) · scans input_text · 80ms
3. **Feature extractor** · encodes status, trigger_kind, TF-IDF · 25ms
4. **Odysseus router** · RandomForest predict_proba · 40ms
5. **Confidence gate** (§103.5) · if max_proba < 0.6 → HITL queue · 5ms
6. **Audit emit** (§38.3) · request_id, prediction, confidence · 20ms
7. **Dispatch** · payload → predicted agent's Redis queue · 10ms

**Total**: ~210ms/request
**Agents**: sys_odysseus_ai_agent + sys_prompt_injection_agent
**Cost**: $0.0012/case (compute) + audit overhead
**Accuracy**: 0.959 (REAL · 1931 held-out)
**Misroute rate**: 4.1%

**Speedup vs manual**: 42 min → 210ms = **12,000× faster**
**Misroute reduction**: 25% → 4.1% = 83.4% relative reduction

§139 automatic process · REAL measured metrics
