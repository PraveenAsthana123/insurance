# Rossmann Store Sales — Business Context

## Dataset overview

Rossmann is a European drugstore chain with 1,115 stores across Germany, Austria, and neighboring countries. The dataset covers 2013-01-01 through 2015-07-31 — a 942-day window spanning 2.5 years. Each daily row records sales revenue, customer count, whether the store was open, and whether a promotion was active.

## Store types

- **Type a** — standard store, typical urban / suburban format.
- **Type b** — large format, extended assortment, often city-center flagship.
- **Type c** — compact format, limited SKU range, higher-velocity.
- **Type d** — smallest format, often co-located inside supermarkets.

Type affects baseline sales velocity: type b stores average ~2.5× the daily revenue of type c.

## Assortment levels

- **Basic (a)** — core SKU range, everyday essentials only.
- **Extra (b)** — basic plus seasonal + promotional SKUs.
- **Extended (c)** — basic + extra + specialty (vitamins, cosmetics).

Extended assortment correlates with ~15% higher average basket value.

## Promotions

Two promo flags exist in the dataset:
- **Promo** — a short-term, store-day-level promotion.
- **Promo2** — a continuous consecutive-promotion program a store participates in (starts at a specific week+year, repeats per `PromoInterval`).

Short promos typically lift same-day revenue by 20–35%. The promo2 continuous program has a smaller per-day effect but sustained.

## Competition

`CompetitionDistance` is meters to nearest competing drugstore. Competition-open-since tracks when that competitor launched; sales dip temporarily when a new competitor opens within 500m, recovering over 8–16 weeks.

## Holidays

- **State holidays**: `a` public, `b` Easter, `c` Christmas; `0` if none.
- **School holidays**: boolean.

Christmas week drives a 2–3× revenue spike; most public holidays suppress sales by 30–60% (stores closed or reduced hours).
