# HOLY Beverage — Manufacturing — Data Type: TEXT

> Per global CLAUDE.md §64.26 — every department MUST have at least one
> use case for each applicable data type with before/after visualization
> on a data-table preview in the UI.

## Applicability for manufacturing

✅ **APPLICABLE**

## Use case

Documents → NLP classifier / sentiment / RAG

For Manufacturing: (operator-fill — name the specific business
process this data type powers in this dept; link the relevant sub-process
in `../HOLY_PROCESS_MGMT.md`).

## Owner

Recommended role: `ai-strategy`
(see `../../roles/ai-strategy/HOLY_README.md`)

## Reference pipeline

`backend/ml/reference/nlp_lifecycle.py + rag_lifecycle.py`

Common libraries: spacy, nltk, sentence-transformers, transformers

## Input data source

Operator-fill:
- Source system: _ (CRM / ERP / S3 / API / SFTP / Kafka topic / etc.)
- Endpoint or path: _
- Sample record: _ (paste 1-2 representative rows / payload)
- Volume estimate: _ (records / hour or GB / day)
- Refresh cadence: _ (real-time / hourly / daily / batch)
- Schema location: _ (link to schema registry or doc)
- Owner contact: _

## Before-processing visualization (per §64.19 + §64.26)

Must render in the dept's `/holy/<dept>` UI in the "Data" tab,
under a "Before" collapsible block:

- raw paragraph + token-count histogram
- Saved to: `data/eval/<dept>/<pipeline>/<run_id>/plots/before_*.png`

## After-processing visualization

Must render in the same UI under an "After" collapsible block,
side-by-side with "Before":

- cleaned tokens + TF-IDF top-terms + sentence-length distribution
- Saved to: `data/eval/<dept>/<pipeline>/<run_id>/plots/after_*.png`

## Drill requirement (per §43 + §64.19)

The dept's per-pipeline drill MUST assert:
- Both `before_*.png` AND `after_*.png` exist
- Both files are non-empty + valid PNG header
- Sample data row appears in `manifest.json.sample_input` (truthful — not fabricated)

## Cross-references

- `../HOLY_DATA_MGMT.md` — overall data management policy (per §64.17)
- `../HOLY_PROCESS_MGMT.md` — process catalog
- `../HOLY_FLOW.md` — manual vs automatic flows that consume this data type
- `../../docs/lld/HOLY_LLD.md` — LLD section on data contracts
- Global §64.26 — per-data-type policy
- Global §64.19 — data-prep deep-dive checklist
