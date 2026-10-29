import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, PERSONA_COOKIE, ROLE_LABELS } from "@/lib/auth";
import { APPS } from "@/apps/registry";
import { NavLinks } from "./nav-links";

async function signOut() {
  "use server";
  (await cookies()).set(PERSONA_COOKIE, "", { path: "/", maxAge: 0 });
  redirect("/signin");
}

export async function Nav() {
  const user = await getCurrentUser();
  const apps = APPS.filter((a) => a.slug !== "signin").map((a) => ({
    slug: a.slug,
    name: a.name,
    kind: a.kind,
  }));
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <span className="mark">IO</span>
        InternalOps
      </Link>
      <NavLinks apps={apps} />
      <div className="side-foot">
        <span className="mock-badge">MOCK SSO</span>
        {user ? (
          <>
            <div className="usercard">
              <span className="avatar">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
              <span className="who">
                <div className="nm">{user.name}</div>
                <div className="rl">{ROLE_LABELS[user.role] ?? user.role}</div>
              </span>
            </div>
            <form action={signOut}>
              <button className="secondary small" type="submit">
                Switch user
              </button>
            </form>
          </>
        ) : (
          <Link href="/signin" className="signin-link">
            Sign in →
          </Link>
        )}
      </div>
    </aside>
  );
}
