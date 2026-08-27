"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DishDetailsScreen from "@/components/screens/DishDetailsScreen";
import { useDishById } from "@/lib/store";

export default function DishDetailsPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const dish = useDishById(id);

  // Reachable by deep link, or after sessionStorage is cleared. It used to
  // render a bare unstyled string with no way out of the app.
  if (!dish) {
    return (
      <main className="flex min-h-[70vh] flex-col justify-center gap-4">
        <h1 className="text-2xl font-semibold">We lost that dish</h1>
        <p className="text-muted leading-relaxed">
          It is not in the menu you are looking at. Scan a menu to start again.
        </p>
        <Link
          href="/menu"
          className="bg-accent text-accent-ink rounded-card px-5 py-4 text-center font-semibold"
        >
          Back to the menu
        </Link>
      </main>
    );
  }

  return <DishDetailsScreen dish={dish} onBack={() => router.push("/menu")} />;
}
