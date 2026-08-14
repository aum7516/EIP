# DataMart Analytics — Operations, Formulas & System Architecture

This document provides a comprehensive technical reference for all calculations, semantic metric modeling, data validation routines, statistical formulas, aggregation algorithms, anomaly detection rules, dynamic schema resolution, and AI query operations implemented in the **DataMart Analytics Workspace**.

---

## 1. Semantic Metric Engine Architecture

> **Guiding Principle**: The DataMart never fabricates unavailable business metrics. Metrics are only derived when sufficient source fields exist and a deterministic mathematical relationship is available.

The DataMart tab operates on a transparent, deterministic **Semantic Metric Engine** (`datamartEngine.ts`):

```text
Uploaded CSV / XLSX Dataset
            ↓
    Synonym Alias Mapping
            ↓
 Semantic Metric Status Evaluator
 ├── 1. AVAILABLE  (Directly present in raw CSV)
 ├── 2. DERIVABLE  (Calculated via deterministic formula)
 └── 3. UNAVAILABLE (Insufficient data to compute)
            ↓
 Centralized Reactive Analytics Engine
```

---

## 2. Metric Classification Matrix

For every core business metric, the Semantic Engine determines one of three states:

| Business Metric | `AVAILABLE` Condition | `DERIVABLE` Formula | `UNAVAILABLE` Condition & Reason |
| :--- | :--- | :--- | :--- |
| **Revenue** | CSV has `revenue` column | $\text{Quantity} \times \text{Unit Price} \times \left(1 - \frac{\text{Discount}}{100}\right)$<br>OR $\text{Cost} + \text{Profit}$ | Dataset lacks `revenue`, `quantity` & `unit_price`, or `cost` & `profit`. |
| **Profit** | CSV has `profit` column | $\text{Revenue} - \text{Cost}$ | Dataset lacks `cost` or `profit` information. |
| **Cost** | CSV has `cost` column | $\text{Revenue} - \text{Profit}$ | Dataset lacks `cost`, or `revenue` and `profit`. |
| **Profit Margin** | N/A | $\left(\frac{\text{Profit}}{\text{Revenue}}\right) \times 100$ | Dataset lacks `profit` or `revenue`. |
| **Average Order Value** | N/A | $\frac{\text{Revenue}}{\text{Transaction Count}}$ | Dataset lacks `revenue`. |
| **Units Sold** | CSV has `quantity` column | $\frac{\text{Revenue}}{\text{Unit Price}}$ | Dataset lacks `quantity`, or `revenue` and `unit_price`. |
| **Unit Price** | CSV has `unit_price` column | $\frac{\text{Revenue}}{\text{Quantity}}$ | Dataset lacks `unit_price`, or `revenue` and `quantity`. |
| **Discount** | CSV has `discount` column | N/A | Dataset lacks `discount` column. |

---

## 3. Strict Derivation Rules (No Fabricated Assumptions)

The analytics engine enforces **strict non-fabrication rules**:

1. **NO Silent COGS Assumptions**: The system NEVER assumes $\text{Cost} = \text{Revenue} \times 0.65$.
2. **NO Profit Margin Guesses**: The system NEVER assumes a $35\%$ gross profit margin.
3. **NO Arbitrary Quantity Defaults**: The system NEVER defaults quantity to $1$ unless explicitly present or mathematically derivable ($\frac{\text{Revenue}}{\text{Unit Price}}$).
4. **NO Unlabeled Metric Treatment**: Generic numeric columns are never silently treated as revenue without user mapping.

---

## 4. Test Scenario Validation Matrix

| Test Scenario | Input Fields in CSV | Expected Metric Status | Resulting Dashboard Behavior |
| :--- | :--- | :--- | :--- |
| **Scenario A** | `quantity` + `unit_price` + `discount` | • Revenue: `DERIVABLE`<br>• Profit: `UNAVAILABLE`<br>• Margin: `UNAVAILABLE` | Revenue & Units computed. Profit KPI shows `N/A`. Profitability chart disabled with explanation. |
| **Scenario B** | `revenue` + `cost` | • Revenue: `AVAILABLE`<br>• Profit: `DERIVABLE` (`Rev - Cost`)<br>• Margin: `DERIVABLE` | All profitability KPIs & charts fully enabled. |
| **Scenario C** | `revenue` + `profit` | • Cost: `DERIVABLE` (`Rev - Profit`)<br>• Margin: `DERIVABLE` | All profitability KPIs & charts fully enabled. |
| **Scenario D** | `revenue` + `cost` + `profit` | • All Profitability: `AVAILABLE` / `DERIVABLE` | Full enterprise dashboard active. |
| **Scenario E** | `product` + `category` + `unit_price` only | • Unit Price: `AVAILABLE`<br>• Revenue: `UNAVAILABLE`<br>• Profit: `UNAVAILABLE` | Product price analysis active. Revenue & Profit KPIs display `N/A`. |

---

## 5. Data Validation & Health Profiling Formula

$$
\text{MissingRatio} = \frac{\text{Total Missing Cells}}{\text{Total Rows} \times \text{Total Columns}}, \quad \text{DuplicateRatio} = \frac{\text{Total Duplicate IDs}}{\text{Total Rows}}
$$

$$
\text{Health Score } (H) = \text{Clamp}\Big(100 - \big(\text{MissingRatio} \times 200 + \text{DuplicateRatio} \times 400\big), 60, 100\Big)
$$

---

## 6. AI Analyst ("Ask NEXUS") Metric Awareness

The Ask NEXUS AI Analyst evaluates semantic metric availability before executing query responses:

- If a user asks: *"What is the profit margin?"* and profit/cost are `UNAVAILABLE`, NEXUS responds:
  > *"⚠️ I cannot calculate profit or profit margin from this dataset because cost and profit information are missing from the uploaded file."*
- If the metric is `AVAILABLE` or `DERIVABLE`, NEXUS executes the mathematical derivation first and explains the exact result.
