import { httpBatchLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "@/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpBatchLink;
  return c({
    url:
      env.NEXT_PUBLIC_API_URL ??
      (typeof window === "undefined" ? "http://localhost:8000/trpc" : "/trpc"),
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
