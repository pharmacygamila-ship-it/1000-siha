"use client";
import { useEffect } from "react";
import { useShopStore } from "@/lib/store";
import Home from "../page";

export default function AdminPage() {
  const { syncViewFromURL } = useShopStore();
  useEffect(() => { syncViewFromURL(); }, [syncViewFromURL]);
  return <Home />;
}
