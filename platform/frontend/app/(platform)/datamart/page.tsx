"use client";
import React, { useState, useMemo, useRef } from "react";
import { generateDemoDataset, TransactionRecord } from "@/lib/datamart/sampleData";
import {
  parseCSV,
  profileDataset,
  filterRecords,
  calculateKPIs,
  getRevenueTrend,
  getCategoryPerformance,
  getRegionalPerformance,
  getTopProducts,
  getPaymentDistribution,
  detectAnomalies,
  generateAIInsights,
  FilterState
} from "@/lib/datamart/datamartEngine";

import DatasetHeader from "@/components/datamart/DatasetHeader";
import DatasetHealth from "@/components/datamart/DatasetHealth";
import DataUnderstanding from "@/components/datamart/DataUnderstanding";
import FilterBar from "@/components/datamart/FilterBar";
import KPICards from "@/components/datamart/KPICards";
import RevenueTrend from "@/components/datamart/RevenueTrend";
import CategoryPerformance from "@/components/datamart/CategoryPerformance";
import RegionalPerformance from "@/components/datamart/RegionalPerformance";
import ProfitabilityChart from "@/components/datamart/ProfitabilityChart";
import TopProductsTable from "@/components/datamart/TopProductsTable";
import PaymentMethodChart from "@/components/datamart/PaymentMethodChart";
import AnalyticsExplorer from "@/components/datamart/AnalyticsExplorer";
import DrillDownAnalytics from "@/components/datamart/DrillDownAnalytics";
import AIInsights from "@/components/datamart/AIInsights";
import AnomalyPanel from "@/components/datamart/AnomalyPanel";
import DataTable from "@/components/datamart/DataTable";
import BusinessReportModal from "@/components/datamart/BusinessReportModal";
import { UploadCloud, Zap, BarChart3, Info, Sparkles, Cpu, FileText } from "lucide-react";

export default function DataMartPage() {
  // Centralized Dataset State - Starts empty until user uploads or loads sample
  const [rawRecords, setRawRecords] = useState<TransactionRecord[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState<string>("");
  const [isCustomUploaded, setIsCustomUploaded] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [selectedDrillCategory, setSelectedDrillCategory] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Filter State
  const [filterState, setFilterState] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    category: [],
    region: [],
    customerType: "All",
    productSearch: "",
    paymentMethod: []
  });

  // Handle CSV File Upload
  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const { records, rawHeaders: headers } = parseCSV(text);
        if (records.length > 0) {
          setRawRecords(records);
          setRawHeaders(headers);
          setDatasetName(file.name);
          setIsCustomUploaded(true);

          const dates = records.map(r => r.date).filter((d): d is string => Boolean(d)).sort();
          if (dates.length > 0) {
            setFilterState(prev => ({
              ...prev,
              dateFrom: dates[0],
              dateTo: dates[dates.length - 1]
            }));
          } else {
            setFilterState(prev => ({
              ...prev,
              dateFrom: "",
              dateTo: ""
            }));
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (file: File) => {
    processFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadSampleData = () => {
    const demoData = generateDemoDataset(6500);
    const headers = [
      "transaction_id", "date", "product", "category", "region",
      "customer_type", "quantity", "unit_price", "discount",
      "revenue", "cost", "profit", "payment_method", "salesperson"
    ];
    setRawRecords(demoData);
    setRawHeaders(headers);
    setDatasetName("Sample Retail Transactions (Feb 2026 - Jul 2026)");
    setIsCustomUploaded(false);
    setFilterState({
      dateFrom: "2026-02-01",
      dateTo: "2026-07-31",
      category: [],
      region: [],
      customerType: "All",
      productSearch: "",
      paymentMethod: []
    });
  };

  const handleClearDataset = () => {
    setRawRecords([]);
    setRawHeaders([]);
    setDatasetName("");
    setIsCustomUploaded(false);
    setFilterState({
      dateFrom: "",
      dateTo: "",
      category: [],
      region: [],
      customerType: "All",
      productSearch: "",
      paymentMethod: []
    });
  };

  const handleClearFilters = () => {
    setFilterState({
      dateFrom: "",
      dateTo: "",
      category: [],
      region: [],
      customerType: "All",
      productSearch: "",
      paymentMethod: []
    });
  };

  // Memoized Data Profiling & Semantic Model
  const healthProfile = useMemo(() => profileDataset(rawRecords, rawHeaders), [rawRecords, rawHeaders]);
  const semanticModel = healthProfile.semanticModel;

  // Memoized Filtered Dataset
  const filteredRecords = useMemo(() => filterRecords(rawRecords, filterState), [rawRecords, filterState]);

  // Memoized Dynamic Analytics Calculations (Using Semantic Model)
  const kpis = useMemo(() => calculateKPIs(filteredRecords, semanticModel), [filteredRecords, semanticModel]);
  const revenueTrendData = useMemo(() => getRevenueTrend(filteredRecords), [filteredRecords]);
  const categoryData = useMemo(() => getCategoryPerformance(filteredRecords), [filteredRecords]);
  const regionData = useMemo(() => getRegionalPerformance(filteredRecords), [filteredRecords]);
  const topProducts = useMemo(() => getTopProducts(filteredRecords, 10), [filteredRecords]);
  const paymentDist = useMemo(() => getPaymentDistribution(filteredRecords), [filteredRecords]);
  const anomalies = useMemo(() => detectAnomalies(filteredRecords, semanticModel), [filteredRecords, semanticModel]);
  const aiInsights = useMemo(() => generateAIInsights(filteredRecords, kpis, semanticModel), [filteredRecords, kpis, semanticModel]);

  // Unique list options for FilterBar
  const availableCategories = useMemo(() => Array.from(new Set(rawRecords.map(r => r.category).filter(Boolean))).sort(), [rawRecords]);
  const availableRegions = useMemo(() => Array.from(new Set(rawRecords.map(r => r.region).filter(Boolean))).sort(), [rawRecords]);
  const availablePaymentMethods = useMemo(() => Array.from(new Set(rawRecords.map(r => r.payment_method).filter(Boolean))).sort(), [rawRecords]);

  return (
    <div className="fade-in" style={{ paddingBottom: 60 }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".csv,.xlsx"
        style={{ display: "none" }}
      />

      {/* 1. INITIAL EMPTY STATE: UPLOAD AREA */}
      {rawRecords.length === 0 ? (
        <div style={{ maxWidth: 920, margin: "30px auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span className="badge badge-purple" style={{ fontSize: 12, padding: "4px 12px" }}>
                <Sparkles size={14} /> Orbit EIP Engine
              </span>
            </div>
            <h1 className="font-heading" style={{ fontSize: 34, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-1px" }}>
              DataMart Analytics Workspace
            </h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 10, fontSize: 15, maxWidth: 680, margin: "10px auto 0" }}>
              Upload your transactional CSV dataset to perform automated semantic model parsing, KPI calculation, visual analytics, anomaly detection, and AI business reporting.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="glass-card"
            style={{
              padding: "52px 36px",
              textAlign: "center",
              border: isDragging ? "2px dashed #3b82f6" : "2px dashed var(--border)",
              background: isDragging ? "rgba(59, 130, 246, 0.1)" : "rgba(18, 22, 34, 0.75)",
              borderRadius: 20,
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              marginBottom: 32,
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.6)"
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <UploadCloud size={32} color="#60a5fa" />
            </div>
            <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Drag & Drop your CSV / XLSX file here
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
              Supports transaction records, retail sales, order logs, or custom tabular datasets
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                style={{ fontSize: 14, padding: "12px 26px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <UploadCloud size={18} />
                <span>Browse & Upload CSV File</span>
              </button>

              <button
                className="btn-secondary"
                style={{ fontSize: 14, padding: "12px 24px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSampleData();
                }}
              >
                <Zap size={18} color="#fbbf24" />
                <span>Or Load Sample Dataset (6,500 Txs)</span>
              </button>
            </div>
          </div>

          {/* Expected Schema Guidance */}
          <div className="glass-card" style={{ padding: 26, marginBottom: 24 }}>
            <h4 className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={16} color="#60a5fa" />
              <span>Expected CSV Dataset Schema</span>
            </h4>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Our Semantic Engine automatically determines metric availability (Available, Derivable, or Unavailable):
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                "transaction_id", "date", "product", "category", "region",
                "customer_type", "quantity", "unit_price", "discount",
                "revenue", "cost", "profit", "payment_method", "salesperson"
              ].map(col => (
                <span key={col} className="badge badge-blue font-mono" style={{ fontSize: 11, padding: "4px 10px" }}>
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Operational Workflow Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { step: "01", icon: UploadCloud, title: "Data Ingestion", desc: "Upload raw CSV dataset or test sample data." },
              { step: "02", icon: Cpu, title: "Semantic Parsing", desc: "Determines Available, Derivable & Unavailable metrics." },
              { step: "03", icon: BarChart3, title: "Visual Analytics", desc: "Executive KPIs, trends, Explorer & drill-down." },
              { step: "04", icon: FileText, title: "AI Insights & Report", desc: "Anomaly detection & printable BI executive report." }
            ].map((s, i) => {
              const StepIcon = s.icon;
              return (
                <div key={i} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#60a5fa", letterSpacing: "1px" }}>STEP {s.step}</div>
                    <StepIcon size={16} color="#60a5fa" />
                  </div>
                  <div className="font-heading" style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 2. FULL DATAMART WORKSPACE WHEN DATA IS LOADED */
        <>
          {/* HEADER & INGESTION STATUS */}
          <DatasetHeader
            datasetName={datasetName}
            rowCount={rawRecords.length}
            healthScore={healthProfile.healthScore}
            onFileUpload={handleFileUpload}
            onResetToSample={handleLoadSampleData}
            onClearDataset={handleClearDataset}
            onOpenReport={() => setIsReportOpen(true)}
            isCustomUploaded={isCustomUploaded}
          />

          {/* DATA HEALTH AUDIT */}
          <DatasetHealth health={healthProfile} />

          {/* DATA UNDERSTANDING & SEMANTIC MODEL PANEL */}
          <DataUnderstanding semanticModel={semanticModel} />

          {/* GLOBAL FILTER BAR WITH CALENDAR PICKER & APPLY CHANGES */}
          <FilterBar
            filter={filterState}
            onChange={setFilterState}
            onClear={handleClearFilters}
            categories={availableCategories}
            regions={availableRegions}
            paymentMethods={availablePaymentMethods}
            totalFiltered={filteredRecords.length}
          />

          {/* EXECUTIVE KPI SECTION */}
          <KPICards kpis={kpis} semanticModel={semanticModel} />

          {/* ANALYTICS VISUALIZATIONS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20, marginBottom: 24 }}>
            <RevenueTrend data={revenueTrendData} />
            <CategoryPerformance
              data={categoryData}
              onSelectCategory={(cat) => setSelectedDrillCategory(cat)}
            />
            <RegionalPerformance data={regionData} />
            <ProfitabilityChart data={revenueTrendData} semanticModel={semanticModel} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
            <TopProductsTable products={topProducts} />
            <PaymentMethodChart data={paymentDist} />
          </div>

          {/* ANALYTICS EXPLORER */}
          <AnalyticsExplorer records={filteredRecords} semanticModel={semanticModel} />

          {/* DRILL-DOWN ANALYTICS */}
          <DrillDownAnalytics
            records={filteredRecords}
            selectedCategory={selectedDrillCategory}
            onClearDrillDown={() => setSelectedDrillCategory(null)}
          />

          {/* AI BUSINESS INSIGHTS */}
          <AIInsights insights={aiInsights} />

          {/* ANOMALY DETECTION */}
          <AnomalyPanel anomalies={anomalies} />

          {/* DATA TABLE */}
          <DataTable records={filteredRecords} />

          {/* BUSINESS REPORT MODAL */}
          <BusinessReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            kpis={kpis}
            records={filteredRecords}
            anomalies={anomalies}
            insights={aiInsights}
            datasetName={datasetName}
          />
        </>
      )}
    </div>
  );
}
