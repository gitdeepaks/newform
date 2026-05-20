import { trpc } from "@/trpc/client";

export const useSignup = () => {
  const {
    mutateAsync: createUserWithEmailAndPasswordAsync,
    mutate: createUserWithEmailAndPassword,
    error: createUserWithEmailAndPasswordError,
    isPending: createUserWithEmailAndPasswordIsPending,
    isSuccess: createUserWithEmailAndPasswordIsSuccess,
    isError: createUserWithEmailAndPasswordIsError,
    isIdle: createUserWithEmailAndPasswordIsIdle,
    status: createUserWithEmailAndPasswordStatus,
  } = trpc.auth.createUserWithEmailAndPassword.useMutation();
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
  const {
    mutateAsync: signInUserWithEmailAndPasswordAsync,
    mutate: signInUserWithEmailAndPassword,
    error: signInUserWithEmailAndPasswordError,
    isPending: signInUserWithEmailAndPasswordIsPending,
    isSuccess: signInUserWithEmailAndPasswordIsSuccess,
    isError: signInUserWithEmailAndPasswordIsError,
    isIdle: signInUserWithEmailAndPasswordIsIdle,
    status: signInUserWithEmailAndPasswordStatus,
  } = trpc.auth.signInUserWithEmailAndPassword.useMutation();
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
