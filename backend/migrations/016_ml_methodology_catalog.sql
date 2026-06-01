-- 016_ml_methodology_catalog.sql — ML Methodology Catalog (11 Phases)
--
-- Seeds the 11 phases of the EEG / signal-processing ML methodology
-- into analysis_phase under family='ml_methodology'. Schema was
-- already created in migration 015 (analysis_phase + analysis_module
-- with JSONB details).
--
-- Per operator brief (2026-06-01): the 11 phases (project framing →
-- data → preprocessing → normalization → EDA → feature selection →
-- training → validation → testing → benchmarking → production) cover
-- the construction discipline that has to land BEFORE the AI assurance
-- frameworks (101-111) have anything to verify.
--
-- Companion docs/ml_methodology/<phase>.md files carry the full
-- step-by-step tables (operator's content preserved verbatim). The
-- DB row carries: id, code, name, core question, owner, family.
--
-- Per-step modules (analysis_module) are NOT seeded in this migration.
-- They are large (11 phases × 12-15 steps × rich JSONB) and the
-- markdown docs serve as the authoritative human-readable surface.
-- A follow-up migration will seed module rows once the operator
-- confirms per-step granularity is needed in the DB (vs docs alone).

INSERT INTO analysis_phase (id, code, name, answers_question, owner, family) VALUES
    (201, 'framing',             'Project Framing + Success Criteria',                  'What decision is the model making, and how do we know we won?',                    'Product / Tech Lead',  'ml_methodology'),
    (202, 'data_acquisition',    'Data Acquisition + Dataset Design',                   'Is the data inventory complete, labelled, and split-safe?',                       'Data Engineering',     'ml_methodology'),
    (203, 'preprocessing',       'Filtering + Preprocessing',                           'Has noise been removed without erasing the signal?',                              'Signal Engineer',      'ml_methodology'),
    (204, 'normalization',       'Standardization + Normalization (Leakage-Safe)',      'Are statistics computed from train only and applied consistently?',               'ML Engineer',          'ml_methodology'),
    (205, 'eda',                 'EDA + Feature Evaluation',                            'Which features actually carry the signal — and are they stable?',                 'ML Engineer',          'ml_methodology'),
    (206, 'feature_selection',   'Feature Selection + Dimensionality Reduction',        'Which features survive a robustness gauntlet?',                                   'ML Engineer',          'ml_methodology'),
    (207, 'training',            'Model Training (Baselines → Deep)',                   'Did the deep model actually beat the strong baseline?',                           'ML Engineer',          'ml_methodology'),
    (208, 'validation',          'Model Validation',                                    'Does it generalize across subjects / sessions / devices?',                        'ML Eng + QA',          'ml_methodology'),
    (209, 'testing',             'Model Testing (Final Holdout) + Reporting',           'Single test execution, single result, defensible CI.',                            'QA + Audit',           'ml_methodology'),
    (210, 'benchmarking',        'End-to-End Benchmarking + Reporting Pack',            'Is the paper / thesis story coherent and reproducible?',                          'ML Eng + Research',    'ml_methodology'),
    (211, 'production',          'Production / Pilot Deployment',                       'Does it stay reliable as the world drifts?',                                      'MLOps + SRE',          'ml_methodology')
ON CONFLICT (id) DO UPDATE
    SET code             = EXCLUDED.code,
        name             = EXCLUDED.name,
        answers_question = EXCLUDED.answers_question,
        owner            = EXCLUDED.owner,
        family           = EXCLUDED.family,
        updated_at       = NOW();

-- Verification queries (run after applying):
--
--   SELECT id, code, name, owner
--   FROM analysis_phase
--   WHERE family = 'ml_methodology'
--   ORDER BY id;
--   -- expect 11 rows, 201-211
--
--   SELECT family, count(*)
--   FROM analysis_phase
--   GROUP BY family
--   ORDER BY family;
--   -- expect: ai_assurance = 11 (from migration 015), ml_methodology = 11

-- Composes with:
--   - migration 015 (analysis_phase + analysis_module schema + 11 AI assurance frameworks)
--   - docs/ml_methodology/README.md (catalog index)
--   - docs/ml_methodology/phase_NN_*.md (per-phase methodology tables)
--   - docs/ai_assurance/* (sibling catalog — assurance complement to construction)
