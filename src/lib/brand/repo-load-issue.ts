import type { LoadedBrand } from "@/lib/brand/load";

/**
 * User-facing copy for repository scan issues so users can fix the connection
 * from Settings instead of being sent to a separate error page.
 */
export function describeRepoLoadIssue(input: {
  status: Extract<LoadedBrand["status"], "unsupported" | "failed">;
  repoSlug: string;
  reasonCode: string | null;
  lastScanError: string | null;
}): { title: string; description: string } {
  const { status, repoSlug, reasonCode, lastScanError } = input;

  if (status === "failed") {
    const detail =
      lastScanError?.trim() ||
      "The last scan did not finish successfully. You can try again or connect a different repository.";
    return {
      title: "We couldn’t finish scanning this repository",
      description: `${detail} Repository: ${repoSlug}.`,
    };
  }

  const reason = reasonCode?.trim() ?? "";
  const base = `Repository ${repoSlug} isn’t supported for AutoDSM’s React + TypeScript scan yet, or it’s missing required files.`;

  const byCode: Record<string, string> = {
    "no-package-json": "No package.json was found at the repository root.",
    "invalid-package-json": "package.json could not be read or parsed.",
    "no-react": "React was not detected in dependencies.",
    "no-typescript": "TypeScript was not detected in the project.",
  };

  const specific = byCode[reason] ?? (reason ? `Details: ${reason}.` : "");

  return {
    title: "This repository can’t be scanned as-is",
    description: [base, specific].filter(Boolean).join(" "),
  };
}

export function shouldShowRepoLoadBanner(
  status: LoadedBrand["status"],
): status is "unsupported" | "failed" {
  return status === "unsupported" || status === "failed";
}
