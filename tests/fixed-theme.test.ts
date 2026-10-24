import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("tema fixo independente do sistema", () => {
  const css = read("app/globals.css");
  const layout = read("app/layout.tsx");

  it("liga a variante dark à classe .dark, e não a prefers-color-scheme", () => {
    expect(css).toContain("@custom-variant dark (&:where(.dark, .dark *));");
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(layout).toMatch(/<html lang="pt-BR" className="dark">/);
  });

  it("declara somente o esquema escuro para o navegador", () => {
    expect(css).toContain("color-scheme: only dark;");
    expect(layout).toMatch(/colorScheme: "dark"/);
    expect(layout).toMatch(/themeColor: "#050505"/);
  });

  it("neutraliza cores nativas de autofill e toque em iOS/Android", () => {
    expect(css).toContain("input:-webkit-autofill");
    expect(css).toContain("-webkit-tap-highlight-color: transparent;");
    expect(css).toContain("accent-color: var(--color-primary);");
  });
});
