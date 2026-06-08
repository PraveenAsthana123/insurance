# Analysis Checklist · capital-position-anomaly

> §90 G7-G9.

## 1. Statistical (G7)
- [ ] Pre-registered hypotheses
- [ ] Effect size (Cohen's d / Cliff's δ / ΔF1 / ΔAUC)
- [ ] **95% CI subject-level bootstrap**
- [ ] Paired (McNemar / DeLong / paired-bootstrap)
- [ ] CV stats
- [ ] Multi-comp correction (Holm / BH-FDR)
- [ ] Nonparametric (Wilcoxon / permutation)
- [ ] Rare-event (sensitivity @ FAR · precision @ recall floor)
- [ ] Calibration (ECE · Brier · reliability)
- [ ] Subgroup disparity
- [ ] Robustness significance
- [ ] Model ranking stability
- [ ] Power / sample adequacy

## 2. Subjective (G8)
- [ ] Operator NPS · ≥ 50
- [ ] A/B preference · ≥ 200
- [ ] Word cloud
- [ ] BERTopic themes
- [ ] Quote curation

## 3. Sensitivity (G9)
- [ ] OAT perturbation (±10%)
- [ ] Sobol indices
- [ ] Counterfactual (DiCE / Alibi)
- [ ] Adversarial (FGSM/PGD for CV · TextFooler for NLP)
- [ ] Drift simulation
- [ ] HP sensitivity
