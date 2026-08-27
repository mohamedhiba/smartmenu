"use client";

import { useRouter } from "next/navigation";
import SmartMenuScreen from "@/components/screens/SmartMenuScreen";
import { useMenuStore } from "@/lib/store";

export default function MenuPage() {
  const router = useRouter();
  const items = useMenuStore((state) => state.scored);

  return (
    <SmartMenuScreen
      items={items}
      onSelect={(id) => router.push(`/menu/${id}`)}
      onRescan={() => router.push("/")}
    />
  );
}
