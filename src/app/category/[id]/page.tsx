"use client";
import { useEffect } from "react";
import { useShopStore } from "@/lib/store";
import Home from "../../page";

export default function CategoryPage() {
  const { syncViewFromURL } = useShopStore();
  useEffect(() => { syncViewFromURL(); }, [syncViewFromURL]);
  return <Home />;
}
