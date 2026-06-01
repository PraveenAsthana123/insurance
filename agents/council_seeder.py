"""
HOLY Beverage — council task seeder.

Pushes N tasks into Redis 'council_tasks' queue. Tasks are harder than
the simple seeder — they require the 3-stage council to actually add
value (vs. a single LLM call).

Usage:
  python council_seeder.py [N]   # default N=10
"""
from __future__ import annotations
import json
import os
import random
import sys
import time

import redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# Harder tasks where a reviewer's critique helps
TASKS = [
    ("digital-marketing", "Design a 30-day social media campaign for a new sugar-free energy drink targeting Gen Z. Include 3 content pillars."),
    ("digital-marketing", "Recommend a launch pricing strategy for a premium sparkling water in the US grocery channel."),
    ("customer-experience", "Write a customer-success playbook for handling a recall of a insurerage product. List 5 escalation steps."),
    ("supply-chain", "Identify the top 3 risks in a global insurerage supply chain and propose 1 mitigation each."),
    ("manufacturing", "Recommend the optimal sensor placement for a insurerage bottling line to detect underfill (target accuracy 99.5%)."),
    ("product-rd", "Suggest a research roadmap for a probiotic insurerage launch over 12 months. Include 4 milestones."),
    ("retail-operations", "Propose a planogram strategy for a new functional insurerage in a 4-foot cold case section."),
    ("sales", "Design a tiered pricing model for a insurerage distributor program covering small/medium/large accounts."),
    ("finance", "Build a 5-year revenue forecast framework for a insurerage startup entering 3 new markets. List inputs."),
    ("hr", "Design an interview rubric for hiring a insurerage R&D scientist. Include 5 evaluation criteria."),
    ("procurement", "Develop a supplier diversification strategy for caffeine sourcing across 3 geographies."),
    ("executive-leadership", "Recommend a 3-year strategic priority list for a insurerage CEO entering the EU market."),
]


def main() -> int:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    r.delete("council_tasks", "council_done")

    for i in range(n):
        dept, prompt = random.choice(TASKS)
        task = {
            "id": f"council-{i+1:04d}",
            "department": dept,
            "prompt": prompt,
            "seeded_at": time.time(),
        }
        r.lpush("council_tasks", json.dumps(task))

    print(f"seeded {n} council tasks")
    print(f"queue length: {r.llen('council_tasks')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
