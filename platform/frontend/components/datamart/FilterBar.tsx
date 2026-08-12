"use client";
import React, { useState, useEffect } from "react";
import { FilterState } from "@/lib/datamart/datamartEngine";
import {
  Filter,
  Search,
  Calendar,
  RotateCcw,
  Check,
  Tag,
  Globe,
  CreditCard,
  Zap
} from "lucide-react";

interface FilterBarProps {
  filter: FilterState;
  onChange: (newFilter: FilterState) => void;
  onClear: () => void;
  categories: string[];
  regions: string[];
  paymentMethods: string[];
  totalFiltered: number;
}

export default function FilterBar({
  filter,
  onChange,
  onClear,
  categories,
  regions,
  paymentMethods,
  totalFiltered
}: FilterBarProps) {
  const [stagedFilter, setStagedFilter] = useState<FilterState>(filter);

  useEffect(() => {
    setStagedFilter(filter);
  }, [filter]);

  const activeCount =
    (stagedFilter.dateFrom ? 1 : 0) +
    (stagedFilter.dateTo ? 1 : 0) +
    stagedFilter.category.length +
    stagedFilter.region.length +
    (stagedFilter.customerType && stagedFilter.customerType !== "All" ? 1 : 0) +
    (stagedFilter.productSearch ? 1 : 0) +
    stagedFilter.paymentMethod.length;

  const handleCategoryToggle = (cat: string) => {
    const exists = stagedFilter.category.includes(cat);
    const updated = exists ? stagedFilter.category.filter(c => c !== cat) : [...stagedFilter.category, cat];
    setStagedFilter(prev => ({ ...prev, category: updated }));
  };

  const handleRegionToggle = (reg: string) => {
    const exists = stagedFilter.region.includes(reg);
    const updated = exists ? stagedFilter.region.filter(r => r !== reg) : [...stagedFilter.region, reg];
    setStagedFilter(prev => ({ ...prev, region: updated }));
  };

  const handlePayToggle = (pm: string) => {
    const exists = stagedFilter.paymentMethod.includes(pm);
    const updated = exists ? stagedFilter.paymentMethod.filter(p => p !== pm) : [...stagedFilter.paymentMethod, pm];
    setStagedFilter(prev => ({ ...prev, paymentMethod: updated }));
  };

  const handleApply = () => {
    onChange(stagedFilter);
  };

  const handleClearAll = () => {
    onClear();
  };

  return (
    <div className="glass-card" style={{ padding: "20px 24px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Filter size={18} color="var(--accent-blue)" />
          <h3 className="font-heading" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            Global Dataset Filter Control
          </h3>
          {activeCount > 0 && (
            <span className="badge badge-blue" style={{ fontSize: 11 }}>
              {activeCount} Active ({totalFiltered.toLocaleString()} matching rows)
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleApply}
            className="btn-primary"
            style={{ fontSize: 13, padding: "8px 18px", fontWeight: 700 }}
          >
            <Zap size={14} />
            <span>Apply Filters</span>
          </button>

          {activeCount > 0 && (
            <button onClick={handleClearAll} className="btn-secondary" style={{ fontSize: 12, padding: "8px 14px" }}>
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {/* Date From */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} color="var(--accent-blue)" />
            <span>Date From</span>
          </label>
          <input
            type="date"
            className="input-field font-mono"
            value={stagedFilter.dateFrom}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            onChange={e => setStagedFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
            style={{ fontSize: 12, padding: "8px 10px", cursor: "pointer" }}
          />
        </div>

        {/* Date To */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} color="var(--accent-blue)" />
            <span>Date To</span>
          </label>
          <input
            type="date"
            className="input-field font-mono"
            value={stagedFilter.dateTo}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            onChange={e => setStagedFilter(prev => ({ ...prev, dateTo: e.target.value }))}
            style={{ fontSize: 12, padding: "8px 10px", cursor: "pointer" }}
          />
        </div>

        {/* Product Search */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <Search size={12} color="var(--accent-blue)" />
            <span>Search Item / Rep</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Laptop, Electronics..."
            value={stagedFilter.productSearch}
            onChange={e => setStagedFilter(prev => ({ ...prev, productSearch: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleApply()}
            style={{ fontSize: 12, padding: "8px 10px" }}
          />
        </div>

        {/* Customer Type */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>
            Customer Segment
          </label>
          <select
            className="input-field"
            value={stagedFilter.customerType}
            onChange={e => setStagedFilter(prev => ({ ...prev, customerType: e.target.value }))}
            style={{ fontSize: 12, padding: "8px 10px" }}
          >
            <option value="All">All Customer Segments</option>
            <option value="New">New Customers</option>
            <option value="Returning">Returning Customers</option>
          </select>
        </div>
      </div>

      {/* Multi-select Filter Pills */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 20 }}>
        {/* Categories */}
        {categories.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <Tag size={12} color="#60a5fa" />
              <span>Category Filters:</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categories.map(cat => {
                const active = stagedFilter.category.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryToggle(cat)}
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      border: active ? "1px solid #3b82f6" : "1px solid var(--border)",
                      background: active ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: active ? "#60a5fa" : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s"
                    }}
                  >
                    {active && <Check size={12} />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Regions */}
        {regions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <Globe size={12} color="#34d399" />
              <span>Region Filters:</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {regions.map(reg => {
                const active = stagedFilter.region.includes(reg);
                return (
                  <button
                    key={reg}
                    onClick={() => handleRegionToggle(reg)}
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      border: active ? "1px solid #10b981" : "1px solid var(--border)",
                      background: active ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: active ? "#34d399" : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s"
                    }}
                  >
                    {active && <Check size={12} />}
                    <span>{reg}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <CreditCard size={12} color="#c084fc" />
              <span>Payment Methods:</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {paymentMethods.map(pm => {
                const active = stagedFilter.paymentMethod.includes(pm);
                return (
                  <button
                    key={pm}
                    onClick={() => handlePayToggle(pm)}
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 99,
                      border: active ? "1px solid #8b5cf6" : "1px solid var(--border)",
                      background: active ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: active ? "#c084fc" : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s"
                    }}
                  >
                    {active && <Check size={12} />}
                    <span>{pm}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
