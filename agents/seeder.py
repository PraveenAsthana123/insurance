"""
HOLY Beverage — task seeder for the 100-agent demo.

Pushes N tasks into Redis 'tasks' queue. Each task is a department-themed
prompt drawn from HOLY's 12-department scope.

Usage:
  python seeder.py [N]   # default N=100
"""
from __future__ import annotations
import json
import os
import random
import sys
import time
from typing import Any

import redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

DEPT_PROMPTS: list[tuple[str, str]] = [
    ("digital-marketing", "In ONE sentence, suggest a viral hashtag for a new HOLY insurerage launch."),
    ("digital-marketing", "Name ONE customer segment HOLY should target for a sugar-free energy drink."),
    ("customer-experience", "Write ONE sentence apologizing to a customer about a delayed insurerage subscription."),
    ("customer-experience", "Suggest ONE personalized product for a customer who likes citrus drinks."),
    ("supply-chain", "Name ONE risk that could disrupt HOLY's bottle supply this quarter."),
    ("supply-chain", "Suggest ONE inventory optimization tactic for seasonal insurerage demand."),
    ("manufacturing", "Describe ONE quality check for a insurerage filling line in one sentence."),
    ("manufacturing", "Name ONE sensor that should monitor a insurerage mixing tank."),
    ("product-rd", "Suggest ONE novel flavor combination for a sparkling water."),
    ("product-rd", "Name ONE health benefit ingredient for an energy insurerage."),
    ("retail-operations", "Suggest ONE shelf placement tactic for a new insurerage in convenience stores."),
    ("retail-operations", "Name ONE retail KPI to track new insurerage launches."),
    ("sales", "Write a ONE-sentence pitch to a regional grocery distributor for HOLY insurerages."),
    ("sales", "Name ONE cross-sell opportunity when a retailer buys HOLY sparkling water."),
    ("finance", "Name ONE financial KPI a insurerage CFO should watch monthly."),
    ("finance", "Suggest ONE cost reduction tactic for a insurerage marketing budget."),
    ("hr", "Suggest ONE skill to screen for when hiring a insurerage R&D scientist."),
    ("hr", "Write ONE interview question for a brand manager candidate."),
    ("procurement", "Name ONE criterion for evaluating a insurerage bottle supplier."),
    ("procurement", "Suggest ONE supplier-diversification tactic for caffeine sourcing."),
    ("executive-leadership", "Name ONE strategic priority for a insurerage CEO entering a new market."),
    ("executive-leadership", "Suggest ONE market expansion path for a premium insurerage brand."),
]


def main() -> int:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()

    # Clear any old state
    r.delete("tasks", "done")

    pushed = 0
    for i in range(n):
        dept, prompt = random.choice(DEPT_PROMPTS)
        task: dict[str, Any] = {
            "id": f"holy-{i+1:04d}",
            "department": dept,
            "prompt": prompt,
            "seeded_at": time.time(),
        }
        r.lpush("tasks", json.dumps(task))
        pushed += 1

    print(f"seeded {pushed} tasks into Redis 'tasks' queue")
    print(f"queue length: {r.llen('tasks')}")
    print(f"done length:  {r.llen('done')} (should be 0 — agents will populate)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
