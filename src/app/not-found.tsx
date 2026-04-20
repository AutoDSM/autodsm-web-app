import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-6 py-16 text-[var(--text-primary)]">
      <div className="mx-auto max-w-md text-center">
        <p className="text-caption font-semibold tracking-widest text-[var(--text-tertiary)]">
          404
        </p>
        <h1 className="mt-2 text-h1">Page not found</h1>
        <p className="mt-3 text-body-s text-[var(--text-secondary)] leading-relaxed">
          That URL does not exist, or this brand book is private or has not been published yet.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-6 text-[14px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-[14px] font-medium text-[var(--accent-fg)] transition-opacity hover:opacity-90"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
