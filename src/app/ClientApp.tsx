"use client";
import dynamic from "next/dynamic";
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text"><div role="status" className="text-center"><div className="font-display text-3xl font-semibold">CS2 Match Desk</div><p className="mt-3 text-sm text-muted">Loading / Загрузка…</p></div></main>,
});
export default function ClientApp() { return <App />; }
