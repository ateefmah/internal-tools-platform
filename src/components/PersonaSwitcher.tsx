"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPersona } from "../lib/actions/persona";

export function PersonaSwitcher({
  personas,
  currentId,
}: {
  personas: { id: string; name: string; role: string; blurb: string }[];
  currentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = personas.find((p) => p.id === currentId);

  return (
    <div className="persona">
      <span className="mock-badge">MOCK SSO</span>
      <select
        value={currentId}
        disabled={pending}
        onChange={(e) =>
          startTransition(async () => {
            await setPersona(e.target.value);
            router.refresh();
          })
        }
      >
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.role})
          </option>
        ))}
      </select>
      {current ? <span className="persona-blurb">{current.blurb}</span> : null}
    </div>
  );
}
