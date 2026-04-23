import Link from "next/link";

export function Masthead({ volume }: { volume?: string }) {
  return (
    <div className="masthead">
      <Link href="/" className="wordmark">
        Kept<span className="wm-dot">.</span>
      </Link>
      <div className="meta">
        <span>
          <span className="dot" />
          Synced · just now
        </span>
        {volume ? <span>{volume}</span> : null}
      </div>
    </div>
  );
}
