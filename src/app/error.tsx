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
      <h1>Action blocked</h1>
      <p className="subtitle">The platform controls stopped this action.</p>
      <p>{error.message}</p>
      <button onClick={reset}>Go back</button>
    </div>
  );
}
