import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { APPS } from "../apps/registry";
import { PERSONAS, currentPersona } from "../lib/personas";
import { PersonaSwitcher } from "../components/PersonaSwitcher";

export const metadata: Metadata = {
  title: "InternalOps",
  description: "Internal tools platform prototype — controls enforced by CI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const persona = await currentPersona();

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            InternalOps
          </Link>
          <nav>
            {APPS.map((a) => (
              <Link key={a.slug} href={`/${a.slug}`}>
                {a.name}
              </Link>
            ))}
          </nav>
          <PersonaSwitcher personas={PERSONAS} currentId={persona.id} />
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
