# Federated Learning · Automatic Process (TO-BE)

## Agent pipeline

1. **Intake agent** · validates input · 50ms
2. **Validator agent** · policy match · 100ms
3. **Router agent** · type-aware routing · 200ms
4. **Inference agent** · runs federated-learning model · 200ms
5. **SHAP agent** · top-5 feature attribution · 50ms
6. **Rule agent** · cross-check graph KG · 200ms
7. **Decision agent** · approve/HITL/reject · 100ms

**Total**: ~900ms/case · **Agents**: 7 sys_*_agent · **Cost**: $0.05/case

**Speedup vs manual**: 7hr → 0.9s = **28,000× faster**

§138 automatic process spec
