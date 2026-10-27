"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="notice err" role="alert">
      <strong>Action blocked.</strong>
      <p style={{ margin: "6px 0 12px" }}>{error.message}</p>
      <button className="secondary" onClick={reset}>
        Back
      </button>
    </div>
  );
}
