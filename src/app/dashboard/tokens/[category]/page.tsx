'use client';

import { useParams } from 'next/navigation';
import { TopBar } from '@/components/shell/TopBar';
import { useScanStore } from '@/stores/scan';
import { ColorsPage } from '@/components/tokens/ColorsPage';
import { TypographyPage } from '@/components/tokens/TypographyPage';
import { GenericTokenPage } from '@/components/tokens/GenericTokenPage';

export default function TokenCategoryPage() {
  const params = useParams();
  const category = String(params?.category ?? '');
  const { result } = useScanStore();
  if (!result) return null;

  const tokens = result.tokens.filter((t) => t.category === category);

  return (
    <>
      <TopBar align="left" />
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1080px] mx-auto">
          {tokens.length === 0 ? (
            <EmptyState category={category} />
          ) : category === 'colors' ? (
            <ColorsPage tokens={tokens} />
          ) : category === 'typography' ? (
            <TypographyPage tokens={tokens} />
          ) : (
            <GenericTokenPage category={category} tokens={tokens} />
          )}
        </div>
      </div>
    </>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <div className="py-24 text-center">
      <h1 className="font-display font-bold text-[28px] text-t-primary capitalize">{category}</h1>
      <p className="mt-3 text-[14px] text-t-secondary">
        No {category} tokens detected in this repository.
      </p>
    </div>
  );
}
