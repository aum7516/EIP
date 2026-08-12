"use client";
import React, { useState, useMemo } from "react";
import { TransactionRecord } from "@/lib/datamart/sampleData";
import {
  Table as TableIcon,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface DataTableProps {
  records: TransactionRecord[];
}

export default function DataTable({ records }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showColPicker, setShowColPicker] = useState(false);

  const allCols = useMemo(() => {
    if (!records.length) return [];
    const keysSet = new Set<string>();
    records.forEach(r => Object.keys(r).forEach(k => keysSet.add(k)));

    const labelMap: Record<string, string> = {
      transaction_id: "Tx ID",
      date: "Date",
      product: "Product",
      category: "Category",
      region: "Region",
      customer_type: "Customer",
      quantity: "Qty",
      unit_price: "Unit Price",
      discount: "Disc %",
      revenue: "Revenue",
      cost: "Cost",
      profit: "Profit",
      payment_method: "Payment",
      salesperson: "Salesperson"
    };

    return Array.from(keysSet).map(key => ({
      key,
      label: labelMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      align: ["quantity", "unit_price", "discount", "revenue", "cost", "profit"].includes(key) ? "right" : "left"
    }));
  }, [records]);

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const initVis: Record<string, boolean> = {};
    allCols.forEach((c, idx) => {
      initVis[c.key] = idx < 10;
    });
    setVisibleCols(initVis);
  }, [allCols]);

  const toggleCol = (colKey: string) => {
    setVisibleCols(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const q = searchTerm.toLowerCase();
    return records.filter(r => {
      return Object.values(r).some(val =>
        String(val ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, searchTerm]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? "").toLowerCase();
      const strB = String(valB ?? "").toLowerCase();
      return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSortClick = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatCellValue = (key: string, val: any) => {
    if (val === null || val === undefined || val === "") return "-";
    if (["revenue", "profit", "cost", "unit_price"].includes(key) && typeof val === "number") {
      return `₹${val.toLocaleString("en-IN")}`;
    }
    if (key === "discount" && typeof val === "number") {
      return `${val}%`;
    }
    return String(val);
  };

  const renderSortIcon = (key: string) => {
    if (sortField !== key) return <ArrowUpDown size={12} color="var(--text-muted)" style={{ marginLeft: 4 }} />;
    return sortOrder === "desc" ? <ArrowDown size={12} color="#60a5fa" style={{ marginLeft: 4 }} /> : <ArrowUp size={12} color="#60a5fa" style={{ marginLeft: 4 }} />;
  };

  return (
    <div className="glass-card" style={{ padding: 26, marginBottom: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TableIcon size={18} color="#60a5fa" />
          </div>
          <div>
            <h2 className="font-heading" style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
              Interactive Transaction Data Grid
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              Showing {sortedRecords.length.toLocaleString()} matching records ({allCols.length} columns detected)
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search dataset..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ width: 220, fontSize: 12, padding: "8px 12px 8px 32px" }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          </div>

          <button
            onClick={() => setShowColPicker(!showColPicker)}
            className="btn-secondary"
            style={{ fontSize: 12, padding: "8px 14px" }}
          >
            <Eye size={14} />
            <span>Columns ({Object.values(visibleCols).filter(Boolean).length})</span>
          </button>
        </div>
      </div>

      {showColPicker && (
        <div style={{ background: "rgba(13, 17, 26, 0.9)", padding: 16, borderRadius: 10, border: "1px solid var(--border)", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {allCols.map(c => (
            <label key={c.key} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!visibleCols[c.key]}
                onChange={() => toggleCol(c.key)}
                style={{ accentColor: "var(--accent-blue)" }}
              />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="custom-table">
          <thead>
            <tr>
              {allCols.filter(c => visibleCols[c.key]).map(c => (
                <th
                  key={c.key}
                  onClick={() => handleSortClick(c.key)}
                  style={{ cursor: "pointer", textAlign: (c.align as any) || "left", whiteSpace: "nowrap" }}
                >
                  {c.label} {renderSortIcon(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((r, i) => (
              <tr key={i}>
                {allCols.filter(c => visibleCols[c.key]).map(c => (
                  <td
                    key={c.key}
                    style={{
                      textAlign: (c.align as any) || "left",
                      whiteSpace: "nowrap",
                      fontWeight: c.key === "transaction_id" || c.key === "product" || c.key === "revenue" ? 600 : 400,
                      color: c.key === "transaction_id" ? "#60a5fa" : c.key === "profit" ? "#34d399" : "var(--text-primary)"
                    }}
                    className={["quantity", "unit_price", "discount", "revenue", "cost", "profit", "transaction_id"].includes(c.key) ? "font-mono" : ""}
                  >
                    {formatCellValue(c.key, r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 12 }}>
        <div style={{ color: "var(--text-secondary)" }}>
          Page <strong style={{ color: "var(--text-primary)" }}>{currentPage}</strong> of {totalPages} ({sortedRecords.length.toLocaleString()} total items)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-muted)" }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="input-field"
              style={{ width: 72, padding: "4px 8px", fontSize: 12 }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
