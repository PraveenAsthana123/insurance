# §142 · Open-Source RPA Use Case Catalog

> Open-source RPA tools + 45 use cases × 19 depts.

## Open-source RPA tool inventory

| Tool | Lang | Strengths | When to pick |
|---|---|---|---|
| **Playwright** ✓ | Python/TS | Modern browser auto · headless · fast | Web portal scraping/data entry |
| **Robocorp** | Python | Cloud + on-prem · Robot Framework based | Production RPA at scale |
| **TagUI** | Bash | Simple · Linux-first · OCR built-in | Quick wins · simple scripts |
| **OpenRPA** | C# | Mature · Windows desktop apps | Legacy Windows automation |
| **BotCity** | Python | Python-first · cloud orchestrator | Python teams · cloud-native |
| **Robot Framework + Browser Lib** | Python | Test-first · keyword-driven | Test+RPA dual use |
| **AutoIt** | AutoIt | Windows GUI · old but works | Old Windows enterprise apps |
| **xdotool / wmctrl** | Bash | Linux desktop primitives | Linux GUI auto |
| **Selenium** | Multi | Long-established · wide drivers | Legacy webapps |
| **PyAutoGUI** | Python | Cross-platform mouse/keyboard | Simple desktop scripts |
| **Sikulix** | Java | Image-based recognition · OCR | Apps without good selectors |
| **UI.Vision** | Browser ext | No-code · browser-only | Quick browser automation |
| **n8n + browser nodes** | n8n | Workflow + RPA combo | RPA AS PART of workflow |

## RPA use cases by dept (45 total)

### CLAIMS (5)
| # | RPA target | Tool |
|---|---|---|
| RP-CL-1 | Legacy claim system: copy fields from email to portal form | Playwright + OCR |
| RP-CL-2 | Carrier portal: bulk policy lookup + status check | Playwright |
| RP-CL-3 | Repair shop estimator portal data entry | Playwright |
| RP-CL-4 | Police report request portal upload + retrieve | Sikulix (PDF interaction) |
| RP-CL-5 | Vehicle valuation portal (KBB/NADA) | Playwright |

### UNDERWRITING (4)
| # | Use case |
|---|---|
| RP-UW-1 | Pull MVR from multiple state DMVs |
| RP-UW-2 | CLUE report retrieval (loss history) |
| RP-UW-3 | Property characteristic lookup from county assessor |
| RP-UW-4 | RMS catastrophe risk model UI run |

### FINANCE (4)
| # | Use case |
|---|---|
| RP-FI-1 | ACH portal batch initiation |
| RP-FI-2 | ERP (SAP/Oracle) journal entry posting |
| RP-FI-3 | Vendor portal payment status |
| RP-FI-4 | Bank reconciliation download + match |

### HR (3)
| # | Use case |
|---|---|
| RP-HR-1 | Applicant tracker bulk status update |
| RP-HR-2 | Background check vendor portal |
| RP-HR-3 | Payroll provider import/export |

### IT-OPERATIONS (4)
| # | Use case |
|---|---|
| RP-IT-1 | Active Directory user provisioning (GUI for old systems) |
| RP-IT-2 | Software install via vendor installer GUI |
| RP-IT-3 | Patch management UI orchestration |
| RP-IT-4 | License renewal portal interactions |

### CUSTOMER-SUPPORT (3)
| # | Use case |
|---|---|
| RP-CS-1 | CRM-to-billing data sync (no API) |
| RP-CS-2 | Knowledge base article publish across multiple systems |
| RP-CS-3 | Ticket creation from email forwarding rules |

### SECURITY-OPERATIONS (3)
| # | Use case |
|---|---|
| RP-SC-1 | Vulnerability scanner login + report export |
| RP-SC-2 | SIEM rule export/import (no API) |
| RP-SC-3 | Block list synchronization across firewalls |

### PROCUREMENT (3)
| # | Use case |
|---|---|
| RP-PR-1 | Vendor portal RFQ creation |
| RP-PR-2 | Purchase order entry into ERP |
| RP-PR-3 | Invoice 3-way match portal |

### LEGAL (2)
| # | Use case |
|---|---|
| RP-LG-1 | Court filing portal document upload |
| RP-LG-2 | Conflicts check legacy system |

### SUPPLY-CHAIN (3)
| # | Use case |
|---|---|
| RP-SP-1 | Carrier portal shipment tracking |
| RP-SP-2 | Customs forms data entry |
| RP-SP-3 | Inventory transfer between systems |

### SALES (2)
| # | Use case |
|---|---|
| RP-SA-1 | CRM bulk import from spreadsheet |
| RP-SA-2 | Quote generation in vendor configurator |

### MARKETING (2)
| # | Use case |
|---|---|
| RP-MK-1 | Social media post scheduling (multi-platform) |
| RP-MK-2 | Ad platform creative refresh |

### OPERATIONS (2)
| # | Use case |
|---|---|
| RP-OP-1 | Monitoring dashboard screenshot for daily report |
| RP-OP-2 | Configuration management UI sync |

### FRAUD-INVESTIGATION (3)
| # | Use case |
|---|---|
| RP-FR-1 | NICB database lookup |
| RP-FR-2 | Social media open-source intel gathering |
| RP-FR-3 | Court record search |

### CUSTOMER-EXPERIENCE (1)
| # | Use case |
|---|---|
| RP-CX-1 | Multi-channel feedback aggregation |

### POLICY-ADMIN (1)
| # | Use case |
|---|---|
| RP-PA-1 | Legacy policy admin field update bulk |

### DISTRIBUTION (1)
| # | Use case |
|---|---|
| RP-DI-1 | NIPR (license) registry check |

### ACTUARIAL (1)
| # | Use case |
|---|---|
| RP-AC-1 | Industry data portal extraction |

### ENGINEERING (0)
| # | Use case |
|---|---|
|— |Engineering uses APIs not RPA |

**TOTAL**: 45 RPA use cases · 17 of 19 depts (engineering N/A)

## When to use RPA vs n8n vs direct API

| Situation | Pick |
|---|---|
| Target has REST/GraphQL API | n8n (always faster than RPA) |
| Target has webhook | n8n |
| Target is GUI-only · no API | RPA |
| Target needs human-like clicks (anti-bot) | RPA + stealth |
| Bulk records to enter into legacy | RPA + queue |
| Workflow needs decisions + multi-system | n8n + RPA sub-step |
| Workflow needs AI inference | n8n → /api/v1/predict → result |
| Need OCR on PDFs | RPA + Tesseract OR n8n + Vision API |

## Composing with the rest (per §142.3)

```
n8n (orchestrator)
  ├─ trigger (webhook / cron / email)
  ├─ AI calls (HTTP nodes to /api/v1/predict/*)
  ├─ RAG calls (HTTP nodes to /api/v1/rag/query)
  ├─ DB ops (Postgres node)
  ├─ RPA delegation (Playwright sub-process)
  └─ notification (Slack / Email / SMS)
```

§142 spec · 2026-06-11
