"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card">
      <h1>Action denied</h1>
      <p className="subtitle">The platform controls rejected this request.</p>
      <p className="mono">{error.message}</p>
      <button onClick={reset}>Back</button>
    </div>
  );
}
