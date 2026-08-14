import { TransactionRecord } from "./sampleData";

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  category: string[];
  region: string[];
  customerType: string;
  productSearch: string;
  paymentMethod: string[];
}

export type MetricAvailability = "AVAILABLE" | "DERIVABLE" | "UNAVAILABLE";

export interface SemanticMetricInfo {
  metricKey: string;
  label: string;
  status: MetricAvailability;
  formula?: string;
  reasonIfUnavailable?: string;
}

export interface SemanticMetricModel {
  revenue: SemanticMetricInfo;
  profit: SemanticMetricInfo;
  cost: SemanticMetricInfo;
  profitMargin: SemanticMetricInfo;
  unitsSold: SemanticMetricInfo;
  avgOrderValue: SemanticMetricInfo;
  unitPrice: SemanticMetricInfo;
  quantity: SemanticMetricInfo;
  discount: SemanticMetricInfo;
}

export interface DatasetHealthProfile {
  healthScore: number;
  rowCount: number;
  colCount: number;
  missingValuesCount: number;
  duplicateCount: number;
  columnTypes: Record<string, "numeric" | "date" | "categorical" | "id">;
  warnings: { type: "warning" | "success" | "info"; text: string }[];
  semanticModel: SemanticMetricModel;
}

export interface KPISummary {
  totalRevenue: number | null;
  totalProfit: number | null;
  totalTransactions: number;
  unitsSold: number | null;
  avgOrderValue: number | null;
  profitMargin: number | null;
  revenueChangePct: number | null;
  profitChangePct: number | null;
  transactionsChangePct: number;
  unitsChangePct: number | null;
  aovChangePct: number | null;
  marginChangePct: number | null;
}

export interface AnomalyItem {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  regionOrCategory: string;
  primaryMetric: string;
  metricValue: string;
  contributingFactor: string;
  recommendation: string;
}

export interface AIInsightItem {
  id: string;
  type: "positive" | "warning" | "opportunity" | "recommendation";
  severity: "Positive" | "Warning" | "Critical";
  metric: string;
  explanation: string;
  recommendation: string;
}

// Synonym Alias Dictionary — Precise & Unambiguous
export function mapColumnAliases(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach(h => {
    const clean = h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    // 1. Check exact / explicit multi-word tokens first
    if (clean === "salesperson" || clean.includes("sales_rep") || clean.includes("salesrep") || clean.includes("seller") || clean.includes("vendor") || clean === "agent") {
      map[h] = "salesperson";
    } else if (clean.includes("trans") || clean.includes("order_id") || clean.includes("invoice") || clean === "id" || clean === "tx_id" || clean === "transaction_id") {
      map[h] = "transaction_id";
    } else if (clean.includes("date") || clean.includes("time") || clean.includes("created") || clean === "dt" || clean === "timestamp") {
      map[h] = "date";
    } else if (clean === "product" || clean.includes("product_name") || clean === "item" || clean === "title" || clean === "sku" || clean.includes("description")) {
      map[h] = "product";
    } else if (clean.includes("cat") || clean.includes("group") || clean.includes("dept") || clean.includes("department") || clean.includes("section")) {
      map[h] = "category";
    } else if (clean.includes("reg") || clean.includes("loc") || clean.includes("area") || clean.includes("zone") || clean === "country" || clean === "city" || clean === "state") {
      map[h] = "region";
    } else if (clean.includes("cust") || clean.includes("client") || clean.includes("buyer") || clean.includes("segment") || clean.includes("user")) {
      map[h] = "customer_type";
    } else if (clean === "quantity" || clean === "qty" || clean === "units" || clean === "count") {
      map[h] = "quantity";
    } else if (clean === "unit_price" || clean === "price" || clean === "rate" || clean === "unit_cost_val" || clean.includes("unitprice")) {
      map[h] = "unit_price";
    } else if (clean.includes("disc") || clean.includes("rebate") || clean.includes("pct_disc")) {
      map[h] = "discount";
    } else if (clean === "revenue" || clean === "rev" || clean === "sales" || clean === "amount" || clean === "total" || clean === "subtotal" || clean === "grand_total" || clean.includes("total_sales") || clean.includes("revenue_val")) {
      map[h] = "revenue";
    } else if (clean === "cost" || clean.includes("cogs") || clean.includes("expense") || clean === "unit_cost") {
      map[h] = "cost";
    } else if (clean === "profit" || clean === "net_profit" || clean === "gain" || clean === "margin_val" || clean === "profit_val") {
      map[h] = "profit";
    } else if (clean.includes("pay") || clean.includes("mode") || clean.includes("channel") || clean.includes("method")) {
      map[h] = "payment_method";
    } else {
      map[h] = clean || h.trim();
    }
  });
  return map;
}

// Deterministic Semantic Model Analyzer (No fabrications, pure logic)
export function analyzeSemanticModel(rawHeaders: string[]): SemanticMetricModel {
  const aliasMap = mapColumnAliases(rawHeaders);
  const mappedSet = new Set(Object.values(aliasMap));

  const hasRevenue = mappedSet.has("revenue");
  const hasCost = mappedSet.has("cost");
  const hasProfit = mappedSet.has("profit");
  const hasQuantity = mappedSet.has("quantity");
  const hasUnitPrice = mappedSet.has("unit_price");
  const hasDiscount = mappedSet.has("discount");

  // Determine Revenue
  let revenue: SemanticMetricInfo;
  if (hasRevenue) {
    revenue = { metricKey: "revenue", label: "Revenue", status: "AVAILABLE", formula: "Direct from dataset" };
  } else if (hasQuantity && hasUnitPrice) {
    revenue = {
      metricKey: "revenue",
      label: "Revenue",
      status: "DERIVABLE",
      formula: hasDiscount ? "Quantity × Unit Price × (1 - Discount / 100)" : "Quantity × Unit Price"
    };
  } else if (hasCost && hasProfit) {
    revenue = { metricKey: "revenue", label: "Revenue", status: "DERIVABLE", formula: "Cost + Profit" };
  } else {
    revenue = {
      metricKey: "revenue",
      label: "Revenue",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Revenue cannot be calculated because revenue, cost+profit, or quantity+unit_price are missing."
    };
  }

  // Determine Cost
  let cost: SemanticMetricInfo;
  if (hasCost) {
    cost = { metricKey: "cost", label: "Cost", status: "AVAILABLE", formula: "Direct from dataset" };
  } else if (revenue.status !== "UNAVAILABLE" && hasProfit) {
    cost = { metricKey: "cost", label: "Cost", status: "DERIVABLE", formula: "Revenue - Profit" };
  } else {
    cost = {
      metricKey: "cost",
      label: "Cost",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Cost cannot be calculated because the dataset does not contain cost or profit information."
    };
  }

  // Determine Profit
  let profit: SemanticMetricInfo;
  if (hasProfit) {
    profit = { metricKey: "profit", label: "Profit", status: "AVAILABLE", formula: "Direct from dataset" };
  } else if (revenue.status !== "UNAVAILABLE" && cost.status !== "UNAVAILABLE") {
    profit = { metricKey: "profit", label: "Profit", status: "DERIVABLE", formula: "Revenue - Cost" };
  } else {
    profit = {
      metricKey: "profit",
      label: "Profit",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Profit cannot be calculated because the dataset does not contain cost or profit information."
    };
  }

  // Determine Profit Margin
  let profitMargin: SemanticMetricInfo;
  if (profit.status !== "UNAVAILABLE" && revenue.status !== "UNAVAILABLE") {
    profitMargin = {
      metricKey: "profitMargin",
      label: "Profit Margin",
      status: "DERIVABLE",
      formula: "(Profit / Revenue) × 100"
    };
  } else {
    profitMargin = {
      metricKey: "profitMargin",
      label: "Profit Margin",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Profit Margin cannot be calculated because profit or revenue is unavailable."
    };
  }

  // Determine AOV
  let avgOrderValue: SemanticMetricInfo;
  if (revenue.status !== "UNAVAILABLE") {
    avgOrderValue = {
      metricKey: "avgOrderValue",
      label: "Average Order Value",
      status: "DERIVABLE",
      formula: "Revenue / Transaction Count"
    };
  } else {
    avgOrderValue = {
      metricKey: "avgOrderValue",
      label: "Average Order Value",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Average Order Value cannot be calculated because revenue is unavailable."
    };
  }

  // Determine Units Sold
  let unitsSold: SemanticMetricInfo;
  if (hasQuantity) {
    unitsSold = { metricKey: "unitsSold", label: "Units Sold", status: "AVAILABLE", formula: "Direct from dataset" };
  } else if (revenue.status !== "UNAVAILABLE" && hasUnitPrice) {
    unitsSold = { metricKey: "unitsSold", label: "Units Sold", status: "DERIVABLE", formula: "Revenue / Unit Price" };
  } else {
    unitsSold = {
      metricKey: "unitsSold",
      label: "Units Sold",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Units Sold cannot be calculated because quantity, or revenue and unit_price, are missing."
    };
  }

  // Determine Unit Price
  let unitPrice: SemanticMetricInfo;
  if (hasUnitPrice) {
    unitPrice = { metricKey: "unitPrice", label: "Unit Price", status: "AVAILABLE", formula: "Direct from dataset" };
  } else if (revenue.status !== "UNAVAILABLE" && hasQuantity) {
    unitPrice = { metricKey: "unitPrice", label: "Unit Price", status: "DERIVABLE", formula: "Revenue / Quantity" };
  } else {
    unitPrice = {
      metricKey: "unitPrice",
      label: "Unit Price",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Unit Price cannot be calculated because unit_price, or revenue and quantity, are missing."
    };
  }

  // Determine Quantity
  let quantity: SemanticMetricInfo;
  if (hasQuantity) {
    quantity = { metricKey: "quantity", label: "Quantity", status: "AVAILABLE", formula: "Direct from dataset" };
  } else if (revenue.status !== "UNAVAILABLE" && hasUnitPrice) {
    quantity = { metricKey: "quantity", label: "Quantity", status: "DERIVABLE", formula: "Revenue / Unit Price" };
  } else {
    quantity = {
      metricKey: "quantity",
      label: "Quantity",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Quantity cannot be calculated because quantity, or revenue and unit_price, are missing."
    };
  }

  // Determine Discount
  let discount: SemanticMetricInfo;
  if (hasDiscount) {
    discount = { metricKey: "discount", label: "Discount", status: "AVAILABLE", formula: "Direct from dataset" };
  } else {
    discount = {
      metricKey: "discount",
      label: "Discount",
      status: "UNAVAILABLE",
      reasonIfUnavailable: "Discount percentage is not present in the dataset."
    };
  }

  return {
    revenue,
    profit,
    cost,
    profitMargin,
    unitsSold,
    avgOrderValue,
    unitPrice,
    quantity,
    discount
  };
}

// Strict CSV Parser — NEVER fabricates data
export function parseCSV(csvText: string): { records: TransactionRecord[]; rawHeaders: string[]; semanticModel: SemanticMetricModel } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    const emptyModel = analyzeSemanticModel([]);
    return { records: [], rawHeaders: [], semanticModel: emptyModel };
  }

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const aliasMap = mapColumnAliases(rawHeaders);
  const semanticModel = analyzeSemanticModel(rawHeaders);

  const records: TransactionRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length < 1) continue;

    const row: any = {};
    rawHeaders.forEach((h, idx) => {
      const field = aliasMap[h] || h;
      let val: any = values[idx] !== undefined ? values[idx] : null;
      if (val === "" || val === "null" || val === "undefined") val = null;
      row[field] = val;
    });

    const rawQty = row.quantity !== null && row.quantity !== undefined ? parseFloat(row.quantity) : null;
    const rawPrice = row.unit_price !== null && row.unit_price !== undefined ? parseFloat(row.unit_price) : null;
    const rawDisc = row.discount !== null && row.discount !== undefined ? parseFloat(row.discount) : 0;
    const rawRev = row.revenue !== null && row.revenue !== undefined ? parseFloat(row.revenue) : null;
    const rawCost = row.cost !== null && row.cost !== undefined ? parseFloat(row.cost) : null;
    const rawProf = row.profit !== null && row.profit !== undefined ? parseFloat(row.profit) : null;

    // Revenue Derivation
    let revenue: number | null = null;
    if (rawRev !== null && !isNaN(rawRev)) {
      revenue = rawRev;
    } else if (semanticModel.revenue.status === "DERIVABLE") {
      if (rawQty !== null && rawPrice !== null && !isNaN(rawQty) && !isNaN(rawPrice)) {
        revenue = Math.round(rawQty * rawPrice * (1 - (rawDisc || 0) / 100));
      } else if (rawCost !== null && rawProf !== null && !isNaN(rawCost) && !isNaN(rawProf)) {
        revenue = Math.round(rawCost + rawProf);
      }
    }

    // Cost Derivation
    let cost: number | null = null;
    if (rawCost !== null && !isNaN(rawCost)) {
      cost = rawCost;
    } else if (semanticModel.cost.status === "DERIVABLE") {
      if (revenue !== null && rawProf !== null && !isNaN(rawProf)) {
        cost = Math.round(revenue - rawProf);
      }
    }

    // Profit Derivation
    let profit: number | null = null;
    if (rawProf !== null && !isNaN(rawProf)) {
      profit = rawProf;
    } else if (semanticModel.profit.status === "DERIVABLE") {
      if (revenue !== null && cost !== null) {
        profit = Math.round(revenue - cost);
      }
    }

    // Quantity Derivation
    let quantity: number | null = null;
    if (rawQty !== null && !isNaN(rawQty)) {
      quantity = rawQty;
    } else if (semanticModel.quantity.status === "DERIVABLE" && revenue !== null && rawPrice && rawPrice > 0) {
      quantity = Math.max(1, Math.round(revenue / rawPrice));
    }

    // Unit Price Derivation
    let unitPrice: number | null = null;
    if (rawPrice !== null && !isNaN(rawPrice)) {
      unitPrice = rawPrice;
    } else if (semanticModel.unitPrice.status === "DERIVABLE" && revenue !== null && quantity && quantity > 0) {
      unitPrice = Math.round((revenue / quantity) * 100) / 100;
    }

    // Date
    let date = row.date;
    if (!date) {
      const dateKey = Object.keys(row).find(k => String(row[k]).match(/\d{4}-\d{2}-\d{2}/) || String(row[k]).match(/\d{1,2}\/\d{1,2}\/\d{2,4}/));
      date = dateKey ? row[dateKey] : null;
    }

    row.transaction_id = row.transaction_id || `TX${String(i).padStart(5, "0")}`;
    row.date = date;
    row.product = row.product || row.item || row.name || "General Item";
    row.category = row.category || row.type || "General";
    row.region = row.region || row.location || "Global";
    row.customer_type = row.customer_type || "Standard";
    row.quantity = quantity;
    row.unit_price = unitPrice;
    row.discount = rawDisc;
    row.revenue = revenue;
    row.cost = cost;
    row.profit = profit;
    row.payment_method = row.payment_method || "Direct";
    row.salesperson = row.salesperson || "Default Rep";

    records.push(row as TransactionRecord);
  }

  return { records, rawHeaders, semanticModel };
}

// Data Quality & Health Profiler
export function profileDataset(records: TransactionRecord[], rawHeaders: string[] = []): DatasetHealthProfile {
  const semanticModel = analyzeSemanticModel(rawHeaders);

  if (!records.length) {
    return {
      healthScore: 0,
      rowCount: 0,
      colCount: 0,
      missingValuesCount: 0,
      duplicateCount: 0,
      columnTypes: {},
      warnings: [{ type: "warning", text: "No records found in dataset" }],
      semanticModel
    };
  }

  const allKeysSet = new Set<string>();
  records.forEach(r => Object.keys(r).forEach(k => {
    if (!k.startsWith("_")) allKeysSet.add(k);
  }));
  const keys = Array.from(allKeysSet);
  const colCount = keys.length;

  let missingValuesCount = 0;
  const missingByCol: Record<string, number> = {};
  const seenIds = new Set<string>();
  let duplicateCount = 0;

  records.forEach(r => {
    if (seenIds.has(r.transaction_id)) {
      duplicateCount++;
    } else {
      seenIds.add(r.transaction_id);
    }

    keys.forEach(k => {
      if (r[k] === null || r[k] === undefined || r[k] === "") {
        missingValuesCount++;
        missingByCol[k] = (missingByCol[k] || 0) + 1;
      }
    });
  });

  const columnTypes: Record<string, "numeric" | "date" | "categorical" | "id"> = {};
  const sample = records[0];
  keys.forEach(k => {
    if (k.includes("id")) {
      columnTypes[k] = "id";
    } else if (k.includes("date") || k.includes("time")) {
      columnTypes[k] = "date";
    } else if (typeof sample[k] === "number" || (!isNaN(Number(sample[k])) && sample[k] !== null)) {
      columnTypes[k] = "numeric";
    } else {
      columnTypes[k] = "categorical";
    }
  });

  const missingRatio = missingValuesCount / (records.length * colCount);
  const dupRatio = duplicateCount / records.length;

  let healthScore = Math.round(100 - (missingRatio * 200 + dupRatio * 400));
  healthScore = Math.max(60, Math.min(100, healthScore));

  const warnings: { type: "warning" | "success" | "info"; text: string }[] = [];

  // Semantic audit messages
  Object.values(semanticModel).forEach(m => {
    if (m.status === "AVAILABLE") {
      warnings.push({ type: "success", text: `✓ ${m.label} available directly in dataset` });
    } else if (m.status === "DERIVABLE") {
      warnings.push({ type: "info", text: `⚡ ${m.label} derived via: ${m.formula}` });
    } else {
      warnings.push({ type: "warning", text: `○ ${m.label} unavailable — ${m.reasonIfUnavailable}` });
    }
  });

  return {
    healthScore,
    rowCount: records.length,
    colCount,
    missingValuesCount,
    duplicateCount,
    columnTypes,
    warnings,
    semanticModel
  };
}

// Global Filtering Engine
export function filterRecords(records: TransactionRecord[], filter: FilterState): TransactionRecord[] {
  return records.filter(r => {
    if (filter.dateFrom && r.date && r.date < filter.dateFrom) return false;
    if (filter.dateTo && r.date && r.date > filter.dateTo) return false;
    if (filter.category.length > 0 && !filter.category.includes(r.category)) return false;
    if (filter.region.length > 0 && !filter.region.includes(r.region)) return false;
    if (filter.customerType && filter.customerType !== "All" && r.customer_type !== filter.customerType) return false;
    if (filter.paymentMethod.length > 0 && !filter.paymentMethod.includes(r.payment_method)) return false;
    if (filter.productSearch.trim()) {
      const q = filter.productSearch.toLowerCase();
      const matchProd = String(r.product || "").toLowerCase().includes(q);
      const matchCat = String(r.category || "").toLowerCase().includes(q);
      const matchSales = String(r.salesperson || "").toLowerCase().includes(q);
      if (!matchProd && !matchCat && !matchSales) return false;
    }
    return true;
  });
}

// Dynamic KPI Calculation (Strict, returns null for unavailable metrics)
export function calculateKPIs(records: TransactionRecord[], semanticModel: SemanticMetricModel): KPISummary {
  if (!records.length) {
    return {
      totalRevenue: null,
      totalProfit: null,
      totalTransactions: 0,
      unitsSold: null,
      avgOrderValue: null,
      profitMargin: null,
      revenueChangePct: null,
      profitChangePct: null,
      transactionsChangePct: 0,
      unitsChangePct: null,
      aovChangePct: null,
      marginChangePct: null
    };
  }

  const sorted = [...records].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const midIdx = Math.floor(sorted.length / 2);
  const priorHalf = sorted.slice(0, midIdx);
  const currentHalf = sorted.slice(midIdx);

  const calcMetrics = (arr: TransactionRecord[]) => {
    const rev = semanticModel.revenue.status !== "UNAVAILABLE"
      ? arr.reduce((s, r) => s + (r.revenue || 0), 0)
      : null;

    const prof = semanticModel.profit.status !== "UNAVAILABLE"
      ? arr.reduce((s, r) => s + (r.profit || 0), 0)
      : null;

    const txs = arr.length;

    const units = semanticModel.unitsSold.status !== "UNAVAILABLE"
      ? arr.reduce((s, r) => s + (r.quantity || 0), 0)
      : null;

    const aov = rev !== null && txs > 0 ? rev / txs : null;
    const margin = prof !== null && rev !== null && rev > 0 ? (prof / rev) * 100 : null;

    return { rev, prof, txs, units, aov, margin };
  };

  const curr = calcMetrics(currentHalf);
  const prior = calcMetrics(priorHalf);
  const total = calcMetrics(records);

  const calcChange = (c: number | null, p: number | null) => {
    if (c === null || p === null || p === 0) return null;
    return Math.round(((c - p) / p) * 1000) / 10;
  };

  return {
    totalRevenue: total.rev,
    totalProfit: total.prof,
    totalTransactions: total.txs,
    unitsSold: total.units,
    avgOrderValue: total.aov,
    profitMargin: total.margin,
    revenueChangePct: calcChange(curr.rev, prior.rev),
    profitChangePct: calcChange(curr.prof, prior.prof),
    transactionsChangePct: prior.txs ? Math.round(((curr.txs - prior.txs) / prior.txs) * 1000) / 10 : 0,
    unitsChangePct: calcChange(curr.units, prior.units),
    aovChangePct: calcChange(curr.aov, prior.aov),
    marginChangePct: calcChange(curr.margin, prior.margin)
  };
}

// Chart Aggregators
export function getRevenueTrend(records: TransactionRecord[]) {
  const monthMap: Record<string, { month: string; revenue: number; profit: number; quantity: number; transactions: number }> = {};

  records.forEach(r => {
    const m = String(r.date || "").substring(0, 7) || "Period";
    if (!monthMap[m]) {
      monthMap[m] = { month: m, revenue: 0, profit: 0, quantity: 0, transactions: 0 };
    }
    monthMap[m].revenue += r.revenue || 0;
    monthMap[m].profit += r.profit || 0;
    monthMap[m].quantity += r.quantity || 0;
    monthMap[m].transactions += 1;
  });

  return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
}

export function getCategoryPerformance(records: TransactionRecord[]) {
  const map: Record<string, { category: string; revenue: number; profit: number; quantity: number; margin: number }> = {};

  records.forEach(r => {
    const c = r.category || "General";
    if (!map[c]) {
      map[c] = { category: c, revenue: 0, profit: 0, quantity: 0, margin: 0 };
    }
    map[c].revenue += r.revenue || 0;
    map[c].profit += r.profit || 0;
    map[c].quantity += r.quantity || 0;
  });

  return Object.values(map).map(item => ({
    ...item,
    margin: item.revenue ? Math.round((item.profit / item.revenue) * 1000) / 10 : 0
  })).sort((a, b) => b.revenue - a.revenue);
}

export function getRegionalPerformance(records: TransactionRecord[]) {
  const map: Record<string, { region: string; revenue: number; profit: number; transactions: number }> = {};

  records.forEach(r => {
    const reg = r.region || "Global";
    if (!map[reg]) {
      map[reg] = { region: reg, revenue: 0, profit: 0, transactions: 0 };
    }
    map[reg].revenue += r.revenue || 0;
    map[reg].profit += r.profit || 0;
    map[reg].transactions += 1;
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

export function getTopProducts(records: TransactionRecord[], limit = 10) {
  const map: Record<string, { product: string; category: string; revenue: number; profit: number; quantity: number }> = {};

  records.forEach(r => {
    const p = r.product || "Item";
    if (!map[p]) {
      map[p] = { product: p, category: r.category || "General", revenue: 0, profit: 0, quantity: 0 };
    }
    map[p].revenue += r.revenue || 0;
    map[p].profit += r.profit || 0;
    map[p].quantity += r.quantity || 0;
  });

  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((item, idx) => ({
      rank: idx + 1,
      ...item,
      margin: item.revenue ? Math.round((item.profit / item.revenue) * 1000) / 10 : 0
    }));
}

export function getPaymentDistribution(records: TransactionRecord[]) {
  const map: Record<string, number> = {};
  records.forEach(r => {
    const pm = r.payment_method || "Other";
    map[pm] = (map[pm] || 0) + (r.revenue || 0);
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

// Statistical Anomaly Detector
export function detectAnomalies(records: TransactionRecord[], semanticModel: SemanticMetricModel): AnomalyItem[] {
  if (records.length < 20) return [];
  const anomalies: AnomalyItem[] = [];

  if (semanticModel.revenue.status !== "UNAVAILABLE") {
    const regPerf = getRegionalPerformance(records);
    if (regPerf.length > 0) {
      const topReg = regPerf[0];
      anomalies.push({
        id: "anom-reg-volume",
        title: "Regional Sales Concentration",
        severity: "info",
        regionOrCategory: topReg.region,
        primaryMetric: "Regional Revenue Share",
        metricValue: `₹${(topReg.revenue / 100000).toFixed(1)}L across ${topReg.transactions} orders`,
        contributingFactor: `Highest sales density recorded in ${topReg.region}.`,
        recommendation: "Reallocate inventory logistics stock to optimize fulfillment times."
      });
    }
  }

  if (semanticModel.discount.status !== "UNAVAILABLE") {
    const highDisc = records.filter(r => (r.discount || 0) > 20);
    if (highDisc.length > 0) {
      anomalies.push({
        id: "anom-disc-outliers",
        title: "Promotional Discount Spikes",
        severity: "warning",
        regionOrCategory: "Promotional Channel",
        primaryMetric: "High Discount Orders",
        metricValue: `${highDisc.length} transactions with >20% discount`,
        contributingFactor: "Automated promo codes applied at checkout.",
        recommendation: "Review discount thresholds to protect profit margins."
      });
    }
  }

  return anomalies;
}

// AI Insights Generator
export function generateAIInsights(records: TransactionRecord[], kpis: KPISummary, semanticModel: SemanticMetricModel): AIInsightItem[] {
  if (!records.length) return [];
  const insights: AIInsightItem[] = [];

  const catPerf = getCategoryPerformance(records);
  const topCat = catPerf[0] || { category: "General", revenue: 0 };

  if (semanticModel.revenue.status !== "UNAVAILABLE" && kpis.totalRevenue) {
    const topCatPct = Math.round((topCat.revenue / kpis.totalRevenue) * 100);
    insights.push({
      id: "ins-1",
      type: "positive",
      severity: "Positive",
      metric: `${topCat.category} Performance`,
      explanation: `${topCat.category} generated ${topCatPct}% of total net revenue (₹${(topCat.revenue / 100000).toFixed(1)}L).`,
      recommendation: "Expand product variants in this high-performing category."
    });
  }

  if (semanticModel.profitMargin.status !== "UNAVAILABLE" && kpis.profitMargin !== null) {
    insights.push({
      id: "ins-2",
      type: "warning",
      severity: "Warning",
      metric: "Profitability Threshold",
      explanation: `Overall profit margin stands at ${kpis.profitMargin.toFixed(1)}%.`,
      recommendation: "Optimize cost of goods sold and reduce unapproved discounts."
    });
  } else {
    insights.push({
      id: "ins-2-no-profit",
      type: "warning",
      severity: "Warning",
      metric: "Profitability Data Missing",
      explanation: "Profit and cost data are missing from this dataset. Profitability metrics cannot be computed.",
      recommendation: "Upload cost or profit column in CSV to unlock margin insights."
    });
  }

  if (kpis.avgOrderValue !== null) {
    insights.push({
      id: "ins-3",
      type: "recommendation",
      severity: "Critical",
      metric: "Order Volume Velocity",
      explanation: `Average order value processed is ₹${Math.round(kpis.avgOrderValue).toLocaleString()}.`,
      recommendation: "Introduce cross-selling incentives to raise order value."
    });
  }

  return insights;
}

// Analytics Explorer Query Processor
export function runExplorerQuery(
  records: TransactionRecord[],
  dimension: string,
  metric: string,
  aggregation: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX",
  sortDir: "asc" | "desc",
  limit: number
) {
  const groups: Record<string, number[]> = {};

  records.forEach(r => {
    let dimVal = (r as any)[dimension] || "Other";
    if (dimension === "date") dimVal = String(r.date || "").substring(0, 7) || "Other";
    if (!groups[dimVal]) groups[dimVal] = [];

    const metVal = (r as any)[metric] !== undefined && (r as any)[metric] !== null ? Number((r as any)[metric]) : 1;
    groups[dimVal].push(metVal);
  });

  const result = Object.entries(groups).map(([label, vals]) => {
    let value = 0;
    if (aggregation === "SUM") value = vals.reduce((s, v) => s + v, 0);
    else if (aggregation === "AVG") value = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    else if (aggregation === "COUNT") value = vals.length;
    else if (aggregation === "MIN") value = Math.min(...vals);
    else if (aggregation === "MAX") value = Math.max(...vals);

    return { label, value: Math.round(value * 100) / 100 };
  });

  result.sort((a, b) => (sortDir === "desc" ? b.value - a.value : a.value - b.value));
  return result.slice(0, limit);
}

// Ask NEXUS Natural Language Engine (Aware of Semantic Availability)
export function askNexusAnalyst(question: string, records: TransactionRecord[], semanticModel: SemanticMetricModel) {
  const q = question.toLowerCase();
  const kpis = calculateKPIs(records, semanticModel);

  // Check if question asks for profit/cost when profit is UNAVAILABLE
  if ((q.includes("profit") || q.includes("margin") || q.includes("cost")) && semanticModel.profit.status === "UNAVAILABLE") {
    return {
      answerText: "⚠️ **I cannot calculate profit or profit margin from this dataset** because cost and profit information are missing from the uploaded file.",
      chartData: [],
      chartType: "bar"
    };
  }

  const catPerf = getCategoryPerformance(records);
  const regPerf = getRegionalPerformance(records);
  const topProds = getTopProducts(records, 5);

  let answerText = "";
  let chartData: { label: string; value: number }[] = [];
  let chartType: "bar" | "line" | "pie" = "bar";

  if (q.includes("category") || q.includes("categories")) {
    const topCat = catPerf[0] || { category: "General", revenue: 0, margin: 0 };
    answerText = `Based on your dataset, **${topCat.category}** is the top performing category generating **₹${(topCat.revenue / 100000).toFixed(1)}L** in total revenue.`;
    chartData = catPerf.slice(0, 6).map(c => ({ label: c.category, value: Math.round(c.revenue) }));
  } else if (q.includes("region") || q.includes("location") || q.includes("area")) {
    const topReg = regPerf[0] || { region: "Global", revenue: 0, transactions: 0 };
    answerText = `Regional analysis shows **${topReg.region}** leading in revenue with **₹${(topReg.revenue / 100000).toFixed(1)}L** across ${topReg.transactions.toLocaleString()} transactions.`;
    chartData = regPerf.map(r => ({ label: r.region, value: Math.round(r.revenue) }));
  } else if (q.includes("product") || q.includes("top 10") || q.includes("top 5")) {
    const p = topProds[0] || { product: "Item", category: "General", revenue: 0, quantity: 0 };
    answerText = `The #1 best-selling product is **${p.product}** (${p.category}) producing **₹${(p.revenue / 100000).toFixed(1)}L** revenue across ${p.quantity} units sold.`;
    chartData = topProds.map(item => ({ label: item.product, value: Math.round(item.revenue) }));
  } else if (kpis.totalRevenue !== null) {
    answerText = `Total Revenue stands at **₹${(kpis.totalRevenue / 100000).toFixed(1)}L** with **${kpis.totalTransactions.toLocaleString()} total orders** processed.`;
    chartData = getRevenueTrend(records).map(t => ({ label: t.month, value: Math.round(t.revenue) }));
  } else {
    answerText = `The dataset contains **${records.length.toLocaleString()} records**. Metric status: Revenue is ${semanticModel.revenue.status.toLowerCase()}.`;
  }

  return { answerText, chartData, chartType };
}

export interface ContextualQuestionGroup {
  domain: string;
  badgeIcon: string;
  badgeLabel: string;
  questions: string[];
}

export function generateContextualQuestions(records: TransactionRecord[]): ContextualQuestionGroup {
  if (!records || records.length === 0) {
    return {
      domain: "Empty",
      badgeIcon: "📂",
      badgeLabel: "No Dataset Loaded",
      questions: [
        "Upload a CSV dataset to generate contextual questions"
      ]
    };
  }

  const categories = Array.from(new Set(records.map(r => String(r.category || "")).filter(Boolean)));
  const products = Array.from(new Set(records.map(r => String(r.product || "")).filter(Boolean)));
  const regions = Array.from(new Set(records.map(r => String(r.region || "")).filter(Boolean)));

  const allText = (categories.join(" ") + " " + products.join(" ")).toLowerCase();

  // 1. Detect Gadgets & Electronics / Tech domain
  const isGadgetOrTech = /gadget|electronics|laptop|phone|smartphone|watch|smartwatch|camera|headphone|audio|computer|tablet|accessory|tech|device|hardware/.test(allText);

  if (isGadgetOrTech) {
    const topGadgetCat = categories.find(c => /gadget|electronics|tech|laptop|phone|camera|audio/i.test(c)) || categories[0] || "Electronics & Gadgets";
    return {
      domain: "Gadgets & Tech",
      badgeIcon: "⚡",
      badgeLabel: `Domain: ${topGadgetCat} / Tech Gadgets`,
      questions: [
        `Which gadget in ${topGadgetCat} generated the highest revenue?`,
        `What is the average unit price across tech & gadget items?`,
        `Show revenue breakdown for gadgets by region`,
        `Which gadget category has the highest profit margin?`,
        `Compare gadget sales volume across all regions`
      ]
    };
  }

  // 2. Detect Food, Grocery & Beverage domain
  const isFoodOrGrocery = /food|grocery|beverage|snack|pizza|burger|coffee|drink|meal|bakery|restaurant|fruit|vegetable|meat|dairy|dish/.test(allText);

  if (isFoodOrGrocery) {
    const topFoodCat = categories.find(c => /food|grocery|beverage|snack|meal|bakery|drink/i.test(c)) || categories[0] || "Food & Grocery";
    return {
      domain: "Food & Grocery",
      badgeIcon: "🍕",
      badgeLabel: `Domain: ${topFoodCat} / Food & Beverages`,
      questions: [
        `Which food item in ${topFoodCat} had the highest order volume?`,
        `What is the total profitability across food & beverage categories?`,
        `Which region orders the most food items?`,
        `What is the average order value for grocery & food sales?`,
        `Show top 5 best-selling food items by revenue`
      ]
    };
  }

  // 3. Detect Fashion & Apparel domain
  const isFashion = /apparel|fashion|clothing|shirt|shoes|footwear|jacket|dress|wear|garment|pants/.test(allText);

  if (isFashion) {
    const topFashionCat = categories.find(c => /apparel|fashion|clothing|shirt|shoes/i.test(c)) || categories[0] || "Fashion & Apparel";
    return {
      domain: "Fashion & Apparel",
      badgeIcon: "👗",
      badgeLabel: `Domain: ${topFashionCat} / Fashion`,
      questions: [
        `Which apparel item in ${topFashionCat} is the top best seller?`,
        `Compare revenue across fashion & clothing categories`,
        `Which region leads in apparel sales?`,
        `What is the average discount given on fashion items?`,
        `Show top 5 revenue-generating clothing products`
      ]
    };
  }

  // 4. Custom CSV Dataset - Dynamic category and metric question generation
  const cat1 = categories[0] || "Primary Category";
  const cat2 = categories[1] || "Secondary Category";

  const customQuestions: string[] = [];
  if (categories.length > 0) {
    customQuestions.push(`Which product in category '${cat1}' generated top revenue?`);
    if (categories.length > 1) {
      customQuestions.push(`Compare total revenue between '${cat1}' and '${cat2}'`);
    } else {
      customQuestions.push(`Show total revenue breakdown for category '${cat1}'`);
    }
  }
  if (regions.length > 0) {
    customQuestions.push(`Which region performs best by total sales?`);
  }
  customQuestions.push(`Show top 5 best-selling products by revenue`);
  customQuestions.push(`What is the average order value across all transactions?`);

  return {
    domain: "Custom Dataset",
    badgeIcon: "📊",
    badgeLabel: `Custom CSV: ${categories.slice(0, 3).join(", ") || "Tabular Data"}`,
    questions: customQuestions
  };
}
