"use client";

import { useState, useTransition } from "react";
import { revealPII } from "@/lib/reveal";

// Reveals a masked PII field. Server-side this requires the pii.reveal
// permission and writes an audit row — watch /audit after clicking.
export function RevealButton({
  entityType,
  entityId,
  field,
}: {
  entityType: string;
  entityId: string;
  field: "taxId" | "email";
}) {
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span>
      {value ? (
        <span className="mono">{value}</span>
      ) : (
        <button
          className="secondary small"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const v = await revealPII(entityType, entityId, field);
                setValue(v || "(empty)");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Blocked");
              }
            })
          }
        >
          {pending ? "Revealing…" : "Reveal (audited)"}
        </button>
      )}
      {error && <span className="due-soon" style={{ marginLeft: 8 }}>{error}</span>}
    </span>
  );
}
