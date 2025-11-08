import { Suspense } from "react";
import dynamic from "next/dynamic";

const PredictionDashboard = dynamic(() => import("@/components/PredictionDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-slate-300">
      Preparing intelligence workspace…
    </div>
  )
});

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 pb-28 pt-16 sm:px-6 lg:px-8">
      <Suspense
        fallback={<div className="flex min-h-screen items-center justify-center text-slate-300">Loading dashboard…</div>}
      >
        <PredictionDashboard />
      </Suspense>
    </main>
  );
}
