"use client";

import { trpc } from "@/trpc/client";
import { env } from "@/env";

type OAuthProvider = "google" | "github";

export const useOAuthSignin = () => {
  const startOAuth = (provider: OAuthProvider) => {
    const apiOrigin = env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8000";
    window.location.href = `${apiOrigin}/auth/${provider}/start`;
  };

  return { startOAuth };
};

export const useOAuthProviders = () => {
  const query = trpc.auth.getOAuthProviders.useQuery();

  return {
    providers: query.data?.providers ?? [],
    providersIsLoading: query.isLoading,
    providersError: query.error,
  };
};

export const useSignup = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createUserWithEmailAndPasswordAsync,
    mutate: createUserWithEmailAndPassword,
    error: createUserWithEmailAndPasswordError,
    isPending: createUserWithEmailAndPasswordIsPending,
    isSuccess: createUserWithEmailAndPasswordIsSuccess,
    isError: createUserWithEmailAndPasswordIsError,
    isIdle: createUserWithEmailAndPasswordIsIdle,
    status: createUserWithEmailAndPasswordStatus,
  } = trpc.auth.createUserWithEmailAndPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.getLoggedInUserInfo.invalidate();
    },
  });
  return {
    createUserWithEmailAndPasswordAsync,
    createUserWithEmailAndPassword,
    createUserWithEmailAndPasswordError,
    createUserWithEmailAndPasswordIsPending,
    createUserWithEmailAndPasswordIsSuccess,
    createUserWithEmailAndPasswordIsError,
    createUserWithEmailAndPasswordIsIdle,
    createUserWithEmailAndPasswordStatus,
  };
};

export const useSignin = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: signInUserWithEmailAndPasswordAsync,
    mutate: signInUserWithEmailAndPassword,
    error: signInUserWithEmailAndPasswordError,
    isPending: signInUserWithEmailAndPasswordIsPending,
    isSuccess: signInUserWithEmailAndPasswordIsSuccess,
    isError: signInUserWithEmailAndPasswordIsError,
    isIdle: signInUserWithEmailAndPasswordIsIdle,
    status: signInUserWithEmailAndPasswordStatus,
  } = trpc.auth.signInUserWithEmailAndPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.getLoggedInUserInfo.invalidate();
    },
  });
  return {
    signInUserWithEmailAndPasswordAsync,
    signInUserWithEmailAndPassword,
    signInUserWithEmailAndPasswordError,
    signInUserWithEmailAndPasswordIsPending,
    signInUserWithEmailAndPasswordIsSuccess,
    signInUserWithEmailAndPasswordIsError,
    signInUserWithEmailAndPasswordIsIdle,
    signInUserWithEmailAndPasswordStatus,
  };
};

export const useLogout = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: logoutAsync,
    mutate: logout,
    error: logoutError,
    isPending: logoutIsPending,
    isSuccess: logoutIsSuccess,
    isError: logoutIsError,
    isIdle: logoutIsIdle,
    status: logoutStatus,
  } = trpc.auth.logout.useMutation({
    onSettled: async () => {
      await utils.auth.getLoggedInUserInfo.reset();
    },
  });

  return {
    logoutAsync,
    logout,
    logoutError,
    logoutIsPending,
    logoutIsSuccess,
    logoutIsError,
    logoutIsIdle,
    logoutStatus,
  };
};

export const useUser = () => {
  const {
    data: user,
    isLoading,
    error,
    isFetched,
    isFetching,
    status,
  } = trpc.auth.getLoggedInUserInfo.useQuery();

  return {
    user,
    error,
    isFetched,
    isFetching,
    status,
    isLoading,
  };
};
