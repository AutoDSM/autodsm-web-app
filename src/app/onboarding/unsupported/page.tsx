'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UnsupportedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <UnsupportedInner />
    </Suspense>
  );
}

function UnsupportedInner() {
  const params = useSearchParams();
  const reason = params.get('reason') ?? 'unknown';
  const repo = params.get('repo') ?? '';
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <main className="min-h-screen flex items-center justify-center surface-primary px-4">
      <div className="w-full max-w-[480px] rounded-2xl border border-t-default p-10" style={{ background: 'var(--bg-elevated)' }}>
        <div className="flex justify-center">
          <Image src="/brand/autodsm-icon-dark.svg" alt="autoDSM" width={32} height={32} />
        </div>
        <h1 className="mt-6 text-center font-display font-semibold text-[22px] text-t-primary">
          autoDSM currently supports React + TypeScript.
        </h1>
        <p className="mt-3 text-center text-[14px] text-t-secondary">
          We detected <span className="font-mono text-t-primary">{humanizeReason(reason)}</span> in this repository. Vue, Svelte, and Angular support is on the roadmap.
        </p>

        {!submitted ? (
          <div className="mt-6 flex flex-col gap-3">
            <Input
              placeholder="you@work.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              size="lg"
              onClick={() => { setSubmitted(true); /* TODO: POST to waitlist */ }}
              disabled={!email}
            >
              Notify me
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-center text-[13px] text-t-secondary">
            Thanks — we'll reach out when <span className="font-mono text-t-primary">{humanizeReason(reason)}</span> support lands.
          </p>
        )}

        <p className="mt-6 text-center">
          <a href="/onboarding" className="text-[13px] text-t-secondary hover:text-t-primary underline underline-offset-4">
            ← Connect a different repository
          </a>
        </p>
        {repo && (
          <p className="mt-1 text-center text-[11px] text-t-tertiary font-mono">{repo}</p>
        )}
      </div>
    </main>
  );
}

function humanizeReason(r: string) {
  switch (r) {
    case 'no_react': return 'no React';
    case 'non_react_framework': return 'a non-React framework';
    case 'no_package_json': return 'no package.json';
    default: return 'an unsupported framework';
  }
}
