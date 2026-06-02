# INSUR Beverage — Enterprise Knowledge Graph

**Source:** operator brief 2026-05-21

## Entity Relationships (Cypher-style)

```
Customer
    ├── buys → Product
    ├── contacts → Support Agent
    ├── belongs_to → Region
    ├── interacts_with → Campaign
    └── subscribes_to → Loyalty Program

Employee
    ├── reports_to → Manager
    ├── works_in → Department
    ├── owns → KPI
    └── accesses → Application

Vendor
    ├── supplies → Ingredient
    ├── governed_by → Contract
    └── linked_to → Risk

Product
    ├── made_from → Ingredient
    ├── sold_in → Region
    ├── promoted_by → Campaign
    └── reviewed_by → Customer

Campaign
    ├── targets → Customer Segment
    ├── runs_on → Channel
    └── owned_by → Marketing Team
```

## Recommended Storage

| Type | Tool |
|---|---|
| Graph DB | Neo4j / JanusGraph |
| Triple Store | RDF / OWL |
| Vector + Graph hybrid | Weaviate, LanceDB |
| Query language | Cypher (Neo4j) / SPARQL (RDF) / GQL |

## AI Use Cases Over the Graph

- Multi-hop reasoning ("which customers bought products from suppliers with high risk score?")
- Org dependency analysis
- Workforce optimization across reporting chains
- Decision chain analysis
- Approval automation traversal
- Org risk mapping
- Collaboration analysis
