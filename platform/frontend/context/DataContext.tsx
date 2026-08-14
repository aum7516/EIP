"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { parseCSV, FilterState } from "@/lib/datamart/datamartEngine";
import { generateDemoDataset, TransactionRecord } from "@/lib/datamart/sampleData";
import { api } from "@/lib/api";

interface DataContextType {
  rawRecords: TransactionRecord[];
  rawHeaders: string[];
  datasetName: string;
  isCustomUploaded: boolean;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  uploadFile: (file: File) => Promise<void>;
  loadSampleData: () => Promise<void>;
  clearDataset: () => void;
  clearFilters: () => void;
}

const defaultFilterState: FilterState = {
  dateFrom: "",
  dateTo: "",
  category: [],
  region: [],
  customerType: "All",
  productSearch: "",
  paymentMethod: []
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "orbit_active_datamart_dataset";

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [rawRecords, setRawRecords] = useState<TransactionRecord[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState<string>("");
  const [isCustomUploaded, setIsCustomUploaded] = useState<boolean>(false);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);

  // Load persisted dataset from LocalStorage on mount
  useEffect(() => {
    try {
      const authUser = localStorage.getItem("orbit_user");
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (authUser && saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rawRecords && parsed.rawRecords.length > 0) {
          setRawRecords(parsed.rawRecords);
          setRawHeaders(parsed.rawHeaders || []);
          setDatasetName(parsed.datasetName || "Uploaded Dataset");
          setIsCustomUploaded(Boolean(parsed.isCustomUploaded));
          if (parsed.filterState) setFilterState(parsed.filterState);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setRawRecords([]);
        setRawHeaders([]);
        setDatasetName("");
        setIsCustomUploaded(false);
      }
    } catch (e) {
      console.error("Failed to restore dataset from LocalStorage", e);
    }
  }, []);

  // Save to LocalStorage whenever records or dataset details change
  const saveToStorage = (records: TransactionRecord[], headers: string[], name: string, isCustom: boolean, filters: FilterState) => {
    try {
      if (!records || records.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return;
      }
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          rawRecords: records,
          rawHeaders: headers,
          datasetName: name,
          isCustomUploaded: isCustom,
          filterState: filters,
        })
      );
    } catch (e) {
      console.warn("LocalStorage space limit reached, preserving state in React memory.", e);
    }
  };

  const uploadFile = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          if (text) {
            const { records, rawHeaders: headers } = parseCSV(text);
            if (records.length > 0) {
              setRawRecords(records);
              setRawHeaders(headers);
              setDatasetName(file.name);
              setIsCustomUploaded(true);

              const dates = records.map((r) => r.date).filter((d): d is string => Boolean(d)).sort();
              const newFilters: FilterState = {
                ...defaultFilterState,
                dateFrom: dates.length > 0 ? dates[0] : "",
                dateTo: dates.length > 0 ? dates[dates.length - 1] : "",
              };
              setFilterState(newFilters);

              // Persist in LocalStorage
              saveToStorage(records, headers, file.name, true, newFilters);

              // Sync file to Backend DuckDB/Parquet engine asynchronously
              try {
                await api.ingestCSV(file);
              } catch (err) {
                console.warn("Backend CSV sync warning (using client memory):", err);
              }
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  };

  const loadSampleData = async () => {
    const demoData = generateDemoDataset(6500);
    const headers = [
      "transaction_id", "date", "product", "category", "region",
      "customer_type", "quantity", "unit_price", "discount",
      "revenue", "cost", "profit", "payment_method", "salesperson"
    ];
    const name = "Sample Retail Transactions (Feb 2026 - Jul 2026)";
    const sampleFilters: FilterState = {
      dateFrom: "2026-02-01",
      dateTo: "2026-07-31",
      category: [],
      region: [],
      customerType: "All",
      productSearch: "",
      paymentMethod: []
    };

    setRawRecords(demoData);
    setRawHeaders(headers);
    setDatasetName(name);
    setIsCustomUploaded(false);
    setFilterState(sampleFilters);

    saveToStorage(demoData, headers, name, false, sampleFilters);

    // Convert demo dataset into CSV Blob and upload to backend FastAPI
    try {
      const csvHeaderStr = headers.join(",") + "\n";
      const csvRows = demoData.map(r =>
        headers.map(h => {
          const val = (r as any)[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string" && val.includes(",")) return `"${val.replace(/"/g, '""')}"`;
          return String(val);
        }).join(",")
      ).join("\n");
      const blob = new Blob([csvHeaderStr + csvRows], { type: "text/csv" });
      const sampleFile = new File([blob], "sample_transactions.csv", { type: "text/csv" });
      await api.ingestCSV(sampleFile);
    } catch (err) {
      console.warn("Backend sample dataset sync warning:", err);
    }
  };

  const clearDataset = () => {
    setRawRecords([]);
    setRawHeaders([]);
    setDatasetName("");
    setIsCustomUploaded(false);
    setFilterState(defaultFilterState);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        sessionStorage.clear();
      } catch {}
    }
  };

  const clearFilters = () => {
    setFilterState(defaultFilterState);
  };

  return (
    <DataContext.Provider
      value={{
        rawRecords,
        rawHeaders,
        datasetName,
        isCustomUploaded,
        filterState,
        setFilterState,
        uploadFile,
        loadSampleData,
        clearDataset,
        clearFilters,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
