import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { viewport } from "@/app/layout";

describe("viewport no celular (JOA-161)", () => {
  it("ocupa a largura do aparelho e não reduz o zoom quando algo passa da tela", () => {
    expect(viewport).toMatchObject({ width: "device-width", initialScale: 1, minimumScale: 1 });
  });

  it("mantém o zoom com pinça liberado (acessibilidade)", () => {
    expect(viewport).not.toHaveProperty("maximumScale");
    expect(viewport).not.toHaveProperty("userScalable");
  });

  it("corta o vazamento horizontal na raiz sem transformar o body em contêiner de rolagem", () => {
    const layout = readFileSync(path.resolve(__dirname, "../app/layout.tsx"), "utf8");
    expect(layout).toMatch(/<html[^>]*className="[^"]*\boverflow-x-hidden\b/);
    expect(layout).toMatch(/<body[^>]*className="[^"]*\boverflow-x-clip\b/);
  });
});
