import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "./nav";

export const metadata: Metadata = {
  title: "InternalOps",
  description: "Internal tools platform prototype — controls enforced by CI",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
