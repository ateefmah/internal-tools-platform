import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InternalOps",
  description: "Internal tools platform prototype — controls enforced by CI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
