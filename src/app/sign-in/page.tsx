import { PERSONAS } from "../../platform/personas";
import { signIn } from "../../platform/actions/persona";

export default function SignInPage() {
  return (
    <div className="card" style={{ maxWidth: 480, margin: "60px auto" }}>
      <h1>Sign in</h1>
      <p className="subtitle">
        Demo sign-in — this is a mock of company SSO, not real authentication.
        Pick a persona to see what each role can do.
      </p>
      <form action={signIn} className="stack">
        {PERSONAS.map((p) => (
          <label key={p.id} className="persona-option">
            <input type="radio" name="persona" value={p.id} required />
            <span>
              <strong>{p.name}</strong> — {p.blurb}
            </span>
          </label>
        ))}
        <button type="submit">Sign in (demo)</button>
      </form>
    </div>
  );
}
