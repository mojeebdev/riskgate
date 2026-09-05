export type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1Statement;
};

export type RuntimeBindings = {
  DB?: D1DatabaseLike;
  [name: string]: unknown;
};

export async function getRuntimeBindings(): Promise<RuntimeBindings> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return env as unknown as RuntimeBindings;
  } catch {
    return process.env as RuntimeBindings;
  }
}
