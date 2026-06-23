"use client";

import dynamic from "next/dynamic";

// Load the original Vite App as a client-only component.
// The original code reads localStorage / window during initial render,
// which breaks Next.js SSR hydration. Disabling SSR restores the Vite behaviour.
const App = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, rgba(245,166,35,0.14), transparent 22%), radial-gradient(circle at top right, rgba(91,141,217,0.12), transparent 20%), linear-gradient(180deg, #0a0b0d 0%, #0d1015 48%, #08090b 100%)",
        color: "#e8eaf0",
        fontFamily: "Rajdhani, sans-serif",
        fontWeight: 600,
        letterSpacing: "0.1em",
      }}
    >
      LOADING CS2 PRO MATCH SIMULATOR…
    </div>
  ),
});

export default function ClientApp() {
  return <App />;
}
