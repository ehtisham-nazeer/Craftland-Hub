import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { customFetch, ApiError } from "./custom-fetch";
import type { Creator, CreatorApplication, CreateCreatorApplicationBody, RejectCreatorApplicationBody, UserProfile } from "./generated/api.schemas";

export const getListCreatorApplicationsQueryKey = (status?: string) =>
  ["/api/creator-applications", status].filter(Boolean);

export const getMyCreatorApplicationsQueryKey = () => ["/api/creator-applications/mine"];

export function useListCreatorApplications(
  params?: { status?: string },
  options?: UseQueryOptions<CreatorApplication[]>
) {
  return useQuery<CreatorApplication[]>({
    queryKey: getListCreatorApplicationsQueryKey(params?.status),
    queryFn: () => {
      const qs = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
      return customFetch<CreatorApplication[]>(`/api/creator-applications${qs}`);
    },
    ...options,
  });
}

export function useMyCreatorApplications(options?: UseQueryOptions<CreatorApplication[]>) {
  return useQuery<CreatorApplication[]>({
    queryKey: getMyCreatorApplicationsQueryKey(),
    queryFn: () => customFetch<CreatorApplication[]>("/api/creator-applications/mine"),
    ...options,
  });
}

export function useCreateCreatorApplication(
  options?: UseMutationOptions<CreatorApplication, unknown, { data: CreateCreatorApplicationBody }>
) {
  return useMutation<CreatorApplication, unknown, { data: CreateCreatorApplicationBody }>({
    mutationFn: ({ data }) =>
      customFetch<CreatorApplication>("/api/creator-applications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useApproveCreatorApplication(
  options?: UseMutationOptions<CreatorApplication, unknown, { id: number }>
) {
  return useMutation<CreatorApplication, unknown, { id: number }>({
    mutationFn: ({ id }) =>
      customFetch<CreatorApplication>(`/api/creator-applications/${id}/approve`, {
        method: "PATCH",
      }),
    ...options,
  });
}

export function useRejectCreatorApplication(
  options?: UseMutationOptions<CreatorApplication, unknown, { id: number; data: RejectCreatorApplicationBody }>
) {
  return useMutation<CreatorApplication, unknown, { id: number; data: RejectCreatorApplicationBody }>({
    mutationFn: ({ id, data }) =>
      customFetch<CreatorApplication>(`/api/creator-applications/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useAdminBootstrap(
  options?: UseMutationOptions<UserProfile, unknown, void>
) {
  return useMutation<UserProfile, unknown, void>({
    mutationFn: () =>
      customFetch<UserProfile>("/api/admin/bootstrap", { method: "POST" }),
    ...options,
  });
}

export function useUpdateUserRole(
  options?: UseMutationOptions<UserProfile, unknown, { id: string; role: string }>
) {
  return useMutation<UserProfile, unknown, { id: string; role: string }>({
    mutationFn: ({ id, role }) =>
      customFetch<UserProfile>(`/api/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    ...options,
  });
}

export const getGetCreatorMeQueryKey = () => ["/api/creators/me"];

export function useGetCreatorMe(options?: UseQueryOptions<Creator | null>) {
  return useQuery<Creator | null>({
    queryKey: getGetCreatorMeQueryKey(),
    queryFn: async () => {
      try {
        return await customFetch<Creator>("/api/creators/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
    ...options,
  });
}
