# Data Quality Checklist · kb-article-rec

> §90 G1-G6 · per Recommender-Text scenario.

## 1. Schema detection
TODO

## 2. Structure tag (per col)
TODO

## 3. Missing value scan
`missingno.matrix()` + `missingno.bar()` PNGs → `plots/missing_*.png`

## 4. Outlier detection
IQR + Z-score + IsolationForest → `plots/box_*.png`

## 5. Distribution analysis
Mean · median · std · skew · kurtosis · KDE per col

## 6. EDA (G2)
- [ ] pandas-profiling / ydata-profiling → `reports/eda_profile.html`
- [ ] Correlation heatmap → `plots/correlation_heatmap.png`
- [ ] Categorical cardinality bars
- [ ] Box + violin per numeric col
- [ ] (if time-series) seasonal_decompose

## 7. Class balance + SMOTE (G3)
- [ ] Class count
- [ ] Imbalance ratio (flag IR > 5)
- [ ] SMOTE vs ADASYN vs class_weight vs undersample decision
- [ ] Validation: ROC + PR-AUC balanced vs imbalanced

## 8. Feature engineering + selection (G4)
- [ ] Numeric scaling
- [ ] Categorical encoding
- [ ] Mutual information ranking
- [ ] Pearson correlation
- [ ] VarianceThreshold
- [ ] RFECV
- [ ] L1-Lasso
- [ ] Tree feature_importances
- [ ] SHAP-based post-hoc

## 9. Data cleaning (G5)
- [ ] Duplicate
- [ ] Typo / fuzzy
- [ ] Format normalize
- [ ] Date parse + validate
- [ ] Unit convert
- [ ] PII redact (§76)
- [ ] Controlled vocabulary

## 10. Data scoring + quality (G6)

| Metric | Threshold | Current | Pass? |
|---|---|---|---|
| Completeness | ≥ 95% | TODO | ☐ |
| Uniqueness (PK) | = 1.0 | TODO | ☐ |
| Validity | ≥ 99% | TODO | ☐ |
| Consistency | < 1% | TODO | ☐ |
| Timeliness | < 24h | TODO | ☐ |
| Accuracy | ≥ 95% | TODO | ☐ |
| **Composite quality** | **≥ 0.85** | TODO | ☐ |
