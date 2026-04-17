'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface Progress {
  phase: string;
  message: string;
  current?: number;
  total?: number;
}

export default function ScanningPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ScanningInner />
    </Suspense>
  );
}

function ScanningInner() {
  const router = useRouter();
  const params = useSearchParams();
  const repo = params.get('repo') ?? '';
  const [status, setStatus] = useState<Progress>({
    phase: 'fetching',
    message: 'Fetching repository…',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) return;
    const es = new EventSource(`/api/scan/stream?repo=${encodeURIComponent(repo)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as Progress & { reason?: string };
        setStatus(data);
        if (data.phase === 'done') {
          es.close();
          setTimeout(() => {
            router.push(`/dashboard?repo=${encodeURIComponent(repo)}`);
          }, 500);
        } else if (data.phase === 'unsupported') {
          es.close();
          router.push(`/onboarding/unsupported?reason=${encodeURIComponent(data.reason ?? '')}&repo=${encodeURIComponent(repo)}`);
        } else if (data.phase === 'error') {
          setError(data.message ?? 'Scan failed.');
          es.close();
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      setError('Connection to scanner lost.');
      es.close();
    };
    return () => es.close();
  }, [repo, router]);

  const [owner, name] = repo.split('/');

  return (
    <main className="min-h-screen flex items-center justify-center surface-primary px-4">
      <div className="w-full max-w-[520px] flex flex-col items-center text-center">
        <Image
          src="/brand/autodsm-icon-dark.svg"
          alt="autoDSM"
          width={40}
          height={40}
          className="animate-brand-pulse"
        />
        <h1 className="mt-6 font-display font-semibold text-[22px] text-t-primary">
          {owner && name ? (
            <>
              <span className="text-t-secondary">{owner}</span>
              <span className="text-t-tertiary"> / </span>
              <span>{name}</span>
            </>
          ) : 'Scanning…'}
        </h1>
        <p className="mt-3 text-[14px] text-t-secondary min-h-[22px]">
          {error ? <span className="text-[var(--error)]">{error}</span> : status.message}
        </p>

        <div className="mt-6 w-full h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full w-1/3 bg-[var(--accent)] animate-sweep"
            style={{ borderRadius: 999 }}
          />
        </div>

        {typeof status.current === 'number' && typeof status.total === 'number' && (
          <p className="mt-3 text-[12px] text-t-tertiary font-mono">
            {status.current}/{status.total} components parsed
          </p>
        )}

        {error && (
          <button
            onClick={() => router.push('/onboarding')}
            className="mt-6 text-[13px] text-t-secondary hover:text-t-primary underline underline-offset-4"
          >
            ← Connect a different repository
          </button>
        )}
      </div>
    </main>
  );
}
