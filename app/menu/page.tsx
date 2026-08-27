"use client";

import { useRouter } from "next/navigation";
import SmartMenuScreen from "@/components/screens/SmartMenuScreen";
import { useMenuStore } from "@/lib/store";

export default function MenuPage() {
  const router = useRouter();
  const items = useMenuStore((state) => state.scored);
  const isSampleData = useMenuStore((state) => state.isSampleData);

  return (
    <SmartMenuScreen
      items={items}
      isSampleData={isSampleData}
      onSelect={(id) => router.push(`/menu/${id}`)}
      onRescan={() => router.push("/")}
    />
  );
}
