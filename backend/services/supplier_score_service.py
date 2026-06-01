"""supplier_score_service — composite 0-100 score per supplier.

Weighted sum of three sub-scores:
    * defect_score     (40%) — inverted from avg dim_sku.defect_rate across shipments
    * lead_time_score  (30%) — inverted from manufacturing_lead_time_days
    * inspection_score (30%) — Pass=100 / Pending=50 / Fail=0

All three are individually surfaced in `sub_scores` so the UI can render
per-driver explanation and the RAG layer can cite specific drivers.
"""
from __future__ import annotations

from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import SupplierScored

INSPECTION_POINTS = {"Pass": 100, "Fail": 0, "Pending": 50}


class SupplierScoreService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()

    def scored(self) -> list[SupplierScored]:
        suppliers = self._repo.list_suppliers()
        out: list[SupplierScored] = []
        for s in suppliers:
            defect = float(self._avg_defect_rate(s["supplier_id"]))
            lead = float(s.get("manufacturing_lead_time_days") or 30)
            inspection_raw = s.get("inspection_results") or "Pending"
            inspection = INSPECTION_POINTS.get(inspection_raw, 50)

            # Lower defect = better. defect 0% → 100, 5%+ → 0
            defect_score = max(0.0, 100.0 - defect * 20.0)
            # Lower lead time = better. 30d → 55, 60d → 10
            lead_score = max(0.0, 100.0 - lead * 1.5)

            score = round(0.4 * defect_score + 0.3 * lead_score + 0.3 * inspection, 1)

            out.append(
                SupplierScored(
                    supplier_id=s["supplier_id"],
                    supplier_name=s.get("supplier_name"),
                    location=s.get("location"),
                    manufacturing_lead_time_days=s.get("manufacturing_lead_time_days"),
                    score=score,
                    sub_scores={
                        "defect": round(defect_score, 1),
                        "lead_time": round(lead_score, 1),
                        "inspection": inspection,
                    },
                )
            )

        ranked = sorted(out, key=lambda x: -x.score)
        emit_event(
            "supply_chain.supplier_scorecard",
            supplier_count=len(ranked),
            top_score=(ranked[0].score if ranked else 0.0),
        )
        return ranked

    def _avg_defect_rate(self, supplier_id: str) -> float:
        with self._repo._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT AVG(s.defect_rate) AS r FROM fact_shipment f "
                "JOIN dim_sku s ON f.sku_id = s.sku_id "
                "WHERE f.supplier_id = %s",
                (supplier_id,),
            )
            row = cur.fetchone()
        return float(row["r"] or 0) if row else 0.0
