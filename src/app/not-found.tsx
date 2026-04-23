import Link from "next/link";
import { Masthead } from "@/components/ui/Masthead";

export default function NotFound() {
  return (
    <div className="app">
      <Masthead />
      <div
        style={{
          padding: "120px 0",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: 72,
            fontStyle: "italic",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Not found
        </h1>
        <p style={{ color: "var(--ink-2)", marginTop: 16 }}>
          The page you're looking for has been kept elsewhere.
        </p>
        <Link href="/" className="btn" style={{ marginTop: 32 }}>
          Back home
        </Link>
      </div>
    </div>
  );
}
