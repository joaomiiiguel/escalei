/// <reference no-default-lib="true" />
/// <reference lib="ES2022" />

/**
 * Declarações mínimas dos globals do runtime Deno necessários pelas
 * Edge Functions do Supabase. Isso permite que o VS Code valide os
 * arquivos sem o plugin oficial do Deno instalado.
 */

declare namespace Deno {
  /** Serve HTTP requests. */
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; hostname?: string },
  ): void;

  /** Get environment variable. */
  function env(): { get(key: string): string | undefined };
  namespace env {
    function get(key: string): string | undefined;
    function set(key: string, value: string): void;
    function delete(key: string): void;
    function toObject(): Record<string, string>;
  }
}
