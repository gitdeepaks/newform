"use client";

import { trpc } from "@/trpc/client";

export const useCreateForm = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createFormAsync,
    mutate: createForm,
    error: createFormError,
    isPending: createFormIsPending,
    isSuccess: createFormIsSuccess,
    isError: createFormIsError,
    isIdle: createFormIsIdle,
    status: createFormStatus,
  } = trpc.form.createForm.useMutation({
    onSuccess: async () => {
      await utils.form.listForms.invalidate();
    },
  });

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

export const useForms = () => {
  const {
    data: forms,
    error: formsError,
    isLoading: formsIsLoading,
    isFetching: formsIsFetching,
    isFetched: formsIsFetched,
    isError: formsIsError,
    status: formsStatus,
  } = trpc.form.listForms.useQuery();

  return {
    forms,
    formsError,
    formsIsLoading,
    formsIsFetching,
    formsIsFetched,
    formsIsError,
    formsStatus,
  };
};
