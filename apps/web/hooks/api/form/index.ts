"use client";

import { trpc } from "@/trpc/client";

export const useCreateForm = () => {
  const {
    mutateAsync: createFormAsync,
    mutate: createForm,
    error: createFormError,
    isPending: createFormIsPending,
    isSuccess: createFormIsSuccess,
    isError: createFormIsError,
    isIdle: createFormIsIdle,
    status: createFormStatus,
  } = trpc.form.createForm.useMutation();

  return {
    createFormAsync,
    createForm,
    createFormError,
    createFormIsPending,
    createFormIsSuccess,
    createFormIsError,
    createFormIsIdle,
    createFormStatus,
  };
};
