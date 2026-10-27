import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser, PERSONA_COOKIE, ROLE_LABELS } from "@/lib/auth";
import { APPS } from "@/apps/registry";

async function signOut() {
  "use server";
  (await cookies()).set(PERSONA_COOKIE, "", { path: "/", maxAge: 0 });
  redirect("/signin");
}

export async function Nav() {
  const user = await getCurrentUser();
  const navApps = APPS.filter((a) => a.slug !== "signin");
  return (
    <div className="topnav">
      <Link href="/" className="brand">
        InternalOps
      </Link>
      <nav>
        {navApps.map((a) => (
          <Link key={a.slug} href={`/${a.slug}`}>
            {a.name}
          </Link>
        ))}
      </nav>
      <div className="who">
        <span className="mock-badge">MOCK SSO — prototype persona switcher</span>
        {user ? (
          <>
            <span>
              {user.name} · {ROLE_LABELS[user.role] ?? user.role}
            </span>
            <form action={signOut} className="inline">
              <button className="secondary small" type="submit">
                Switch user
              </button>
            </form>
          </>
        ) : (
          <Link href="/signin">Sign in</Link>
        )}
      </div>
    </div>
  );
}
