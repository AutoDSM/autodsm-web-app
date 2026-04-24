import { describe, expect, it } from "vitest";
import { parseTailwindConfig } from "./tailwind-config";

describe("parseTailwindConfig flattenColors", () => {
  it("promotes DEFAULT to the parent name and prefixes siblings", () => {
    const source = `export default {
      theme: {
        extend: {
          colors: {
            primary: { DEFAULT: '#8f23fa', foreground: '#ffffff' },
            secondary: { DEFAULT: '#0ea5e9', foreground: '#000000' },
          },
        },
      },
    };`;
    const out = parseTailwindConfig(source, "tailwind.config.ts");
    expect(out.colors.primary).toBe("#8f23fa");
    expect(out.colors["primary-foreground"]).toBe("#ffffff");
    expect(out.colors.secondary).toBe("#0ea5e9");
    expect(out.colors["secondary-foreground"]).toBe("#000000");
    expect(out.colors["primary-DEFAULT"]).toBeUndefined();
  });

  it("flattens deeply nested color scales", () => {
    const source = `module.exports = {
      theme: {
        colors: {
          gray: {
            50: '#f9fafb',
            900: '#111827',
          },
        },
      },
    };`;
    const out = parseTailwindConfig(source, "tailwind.config.cjs");
    expect(out.colors["gray-50"]).toBe("#f9fafb");
    expect(out.colors["gray-900"]).toBe("#111827");
  });
});
