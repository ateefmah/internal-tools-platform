"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavApp = { slug: string; name: string; kind: string };

export function NavLinks({ apps }: { apps: NavApp[] }) {
  const pathname = usePathname();
  const sections: { label: string; items: NavApp[] }[] = [
    { label: "Apps", items: apps.filter((a) => a.kind === "app") },
    { label: "Platform", items: apps.filter((a) => a.kind === "platform") },
  ];
  return (
    <nav>
      {sections.map((s) =>
        s.items.length === 0 ? null : (
          <div className="side-section" key={s.label}>
            <div className="side-label">{s.label}</div>
            {s.items.map((a) => {
              const href = `/${a.slug}`;
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={a.slug}
                  href={href}
                  className={`side-link${active ? " active" : ""}`}
                >
                  <span className="dot" />
                  {a.name}
                </Link>
              );
            })}
          </div>
        ),
      )}
    </nav>
  );
}
