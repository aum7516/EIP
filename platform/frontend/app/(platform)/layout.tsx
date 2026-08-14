"use client";
import Sidebar from "@/components/shared/Sidebar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { DataProvider } from "@/context/DataContext";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) router.push("/login");
  }, [router]);

  return (
    <DataProvider>
      <div style={{ display: "flex" }}>
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    </DataProvider>
  );
}

