import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db";
import { PERSONA_COOKIE, ROLE_LABELS } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const uid = String(formData.get("uid") ?? "");
  const user = db.select().from(schema.users).all().find((u) => u.id === uid);
  if (!user) throw new Error("Unknown user");
  (await cookies()).set(PERSONA_COOKIE, user.id, { path: "/" });
  redirect("/");
}

export default function SignInPage() {
  const users = db.select().from(schema.users).all();
  return (
    <>
      <h1>Sign in</h1>
      <p className="subtitle">
        Pick a persona. This is a <strong>mock of company SSO</strong> — a real
        deployment signs in through the company IdP (Entra ID / Okta) via OIDC,
        with SCIM provisioning. Synthetic users only.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>What they can do</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>
                <span className="pill info">{ROLE_LABELS[u.role] ?? u.role}</span>
              </td>
              <td className="muted">{ROLE_BLURB[u.role]}</td>
              <td>
                <form action={signIn} className="inline">
                  <input type="hidden" name="uid" value={u.id} />
                  <button type="submit" className="small">
                    Sign in as {u.name.split(" ")[0]}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

const ROLE_BLURB: Record<string, string> = {
  support_agent: "Refund charges up to $100",
  finance_manager: "Refunds up to $5,000 · approves big refunds, chargeback sign-off, payout releases",
  kyc_analyst: "Claim and review KYC cases, escalate high-risk",
  kyc_senior: "Approve escalated KYC cases",
  ops_manager: "Request tools, log chargebacks, place and release payout holds",
  engineer: "Platform owner — has every permission",
};
