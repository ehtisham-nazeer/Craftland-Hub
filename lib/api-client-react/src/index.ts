export * from "./generated/api";
export * from "./generated/api.schemas";
export * from "./extensions";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

import type { UseQueryOptions } from "@tanstack/react-query";
export type QueryConfig<TData = unknown, TError = unknown> = Omit<
  UseQueryOptions<TData, TError, TData>,
  "queryKey"
>;
