import Link from "next/link";

/**
 * Scan screen. Bootstrap placeholder only.
 *
 * Brandon replaces this with the real container in issue #5, rendering
 * <ScanScreen /> from components/screens once Abigail lands issue #8.
 */
export default function ScanPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-8 py-12">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">SmartMenu</h1>
        <p className="text-muted text-balance">
          Photograph a menu in any language. Get it translated, scored and
          ranked for your diet.
        </p>
      </div>

      <Link
        href="/preferences"
        className="bg-accent text-accent-ink rounded-card px-5 py-4 text-center font-medium"
      >
        Scan a menu
      </Link>

      <p className="text-muted text-xs">
        Bootstrap build. Screens land via issues #5, #7, #8.
      </p>
    </main>
  );
}
