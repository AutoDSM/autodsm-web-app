import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function TokenEmptyState({ category }: { category: string }) {
  return (
    <EmptyState
      icon={<Sparkles size={24} strokeWidth={1.5} />}
      title={`No ${category} found`}
      description="We didn’t extract any matching tokens for this category. Add styles in your repository and scan again, or check another branch."
    />
  );
}

export function UnscannedState({ message }: { message: string }) {
  return (
    <EmptyState
      icon={<Sparkles size={24} strokeWidth={1.5} />}
      title="No brand book yet"
      description={message}
    />
  );
}
