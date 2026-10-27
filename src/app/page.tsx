import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { APPS } from "@/apps/registry";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const apps = APPS.filter((a) => a.kind === "app");
  return (
    <>
      <h1>InternalOps</h1>
      <p className="subtitle">
        Internal tools platform prototype. Every write goes through the platform
        controls — role check, append-only audit, maker-checker approvals, PII
        masking — and CI fails any app that skips them.
      </p>
      {!user && (
        <div className="notice">
          You are not signed in. <Link href="/signin">Pick a persona</Link> to try
          the apps.
        </div>
      )}
      <div className="cards">
        {apps.map((a) => (
          <div className="card" key={a.slug}>
            <h3>
              <Link href={`/${a.slug}`}>{a.name}</Link>
            </h3>
            <p>{a.description}</p>
            <div className="meta">
              owner: {a.owner}
              {a.origin ? ` · ${a.origin}` : ""}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
