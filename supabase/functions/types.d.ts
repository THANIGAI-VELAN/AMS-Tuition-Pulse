declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
  // Ambient declaration for Supabase Edge Runtime
}

declare namespace Deno {
  export interface ServeOptions {
    port?: number;
    hostname?: string;
    onListen?: (params: { port: number; hostname: string }) => void;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: ServeOptions
  ): void;

  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    delete(key: string): void;
    toObject(): Record<string, string>;
  };
}
