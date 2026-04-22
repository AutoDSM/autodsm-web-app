"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TokenPagePillTabSpec = {
  value: string;
  label: string;
  content: React.ReactNode;
};

export type TokenPagePillTabsProps = {
  tabs: TokenPagePillTabSpec[];
  /** Uncontrolled default tab (ignored when `value` is set). */
  defaultValue?: string;
  /** Controlled selected tab. */
  value?: string;
  onValueChange?: (value: string) => void;
};

/**
 * Shared pill tab strip + panels for design-token pages (matches Colors / Typography).
 */
export function TokenPagePillTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
}: TokenPagePillTabsProps) {
  const resolvedDefault = defaultValue ?? tabs[0]?.value ?? "";
  const controlled = value !== undefined && onValueChange !== undefined;

  return (
    <Tabs
      className="w-full max-w-full"
      {...(controlled
        ? { value, onValueChange }
        : { defaultValue: resolvedDefault })}
    >
      <TabsList variant="pill" className="h-auto w-full max-w-md">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-6 outline-none">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
