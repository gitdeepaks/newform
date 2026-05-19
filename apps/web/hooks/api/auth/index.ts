import { trpc } from "@/trpc/client";

export const useSignup = () => {
  const {
    mutateAsync: createUserWithEmailAndPasswordAsync,
    mutate: createUserWithEmailAndPassword,
    error: createUserWithEmailAndPasswordError,
    isPending: createUserWithEmailAndPasswordIsPending,
    isSuccess: createUserWithEmailAndPasswordIsSuccess,
    isError: createUserWithEmailAndPasswordIsError,
  } = trpc.auth.createUserWithEmailAndPassword.useMutation();
  return {
    createUserWithEmailAndPasswordAsync,
    createUserWithEmailAndPassword,
    createUserWithEmailAndPasswordError,
    createUserWithEmailAndPasswordIsPending,
    createUserWithEmailAndPasswordIsSuccess,
    createUserWithEmailAndPasswordIsError,
  };
};
