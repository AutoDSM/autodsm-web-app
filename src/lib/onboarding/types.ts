/**
 * Onboarding draft — v1 is client-only (sessionStorage) until a Supabase profile exists.
 * See docs/ONBOARDING.md.
 */

export type OnboardingRole =
  | "founder"
  | "designer"
  | "design_engineer"
  | "software_engineer"
  | "operations"
  | "other"
  | "";

export type TeamSize = "solo" | "2-10" | "11-50" | "51plus" | "";

/** Wizard position for resume and API `user_onboarding.current_step`. */
export type OnboardingStepKey =
  | "welcome"
  | "role"
  | "team"
  | "company"
  | "connect"
  | "scanning"
  | "review";

export interface OnboardingDraft {
  displayName: string;
  website: string;
  companyName: string;
  companyWebsite: string;
  role: OnboardingRole;
  teamSize: TeamSize;
  /** Last confirmed owner/name before scanning */
  repo: string;
  /** From connect; used as scan project label; synced to DB as intended_project_name */
  projectName: string;
  /**
   * Last saved position from the server: welcome, role, team, company, connect, scanning, review
   * (value means “user should land on or just completed this part of the flow” per API contract).
   */
  currentStep: OnboardingStepKey | "";
}

export const emptyDraft = (): OnboardingDraft => ({
  displayName: "",
  website: "",
  companyName: "",
  companyWebsite: "",
  role: "",
  teamSize: "",
  repo: "",
  projectName: "",
  currentStep: "",
});

export const ROLE_OPTIONS: { value: Exclude<OnboardingRole, "">; label: string }[] = [
  { value: "founder", label: "Founder" },
  { value: "designer", label: "Designer" },
  { value: "design_engineer", label: "Design Engineer" },
  { value: "software_engineer", label: "Software Engineer" },
  { value: "operations", label: "Operations" },
  { value: "other", label: "Other" },
];

export const TEAM_SIZE_OPTIONS: { value: Exclude<TeamSize, "">; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "2-10", label: "2-10" },
  { value: "11-50", label: "11-50" },
  { value: "51plus", label: "51+" },
];
