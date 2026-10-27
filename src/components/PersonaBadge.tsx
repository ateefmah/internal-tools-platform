"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../platform/actions/persona";

export function PersonaBadge({ name, blurb }: { name: string; blurb: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="persona">
      <span className="mock-badge">MOCK SSO</span>
      <span>
        {name} <span className="persona-blurb">— {blurb}</span>
      </span>
      <button
        className="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await signOut();
            router.refresh();
          })
        }
      >
        Sign out
      </button>
    </div>
  );
}
