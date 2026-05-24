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

export const useForm = (formId: string) => {
  const {
    data: form,
    error: formError,
    isLoading: formIsLoading,
    isFetching: formIsFetching,
    isFetched: formIsFetched,
    isError: formIsError,
    status: formStatus,
  } = trpc.form.getForm.useQuery({ formId });

  return {
    form,
    formError,
    formIsLoading,
    formIsFetching,
    formIsFetched,
    formIsError,
    formStatus,
  };
};

export const useSubmitForm = () => {
  const {
    mutateAsync: submitFormAsync,
    mutate: submitForm,
    error: submitFormError,
    isPending: submitFormIsPending,
    isSuccess: submitFormIsSuccess,
    isError: submitFormIsError,
    isIdle: submitFormIsIdle,
    status: submitFormStatus,
  } = trpc.form.submitForm.useMutation();

  return {
    submitFormAsync,
    submitForm,
    submitFormError,
    submitFormIsPending,
    submitFormIsSuccess,
    submitFormIsError,
    submitFormIsIdle,
    submitFormStatus,
  };
};

export const useSubmissions = (formId: string) => {
  const {
    data: submissions,
    error: submissionsError,
    isLoading: submissionsIsLoading,
    isFetching: submissionsIsFetching,
    isFetched: submissionsIsFetched,
    isError: submissionsIsError,
    status: submissionsStatus,
  } = trpc.form.getSubmissions.useQuery({ formId });

  return {
    submissions,
    submissionsError,
    submissionsIsLoading,
    submissionsIsFetching,
    submissionsIsFetched,
    submissionsIsError,
    submissionsStatus,
  };
};

export const useCreateField = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createFieldAsync,
    mutate: createField,
    error: createFieldError,
    isPending: createFieldIsPending,
    isSuccess: createFieldIsSuccess,
    isError: createFieldIsError,
    isIdle: createFieldIsIdle,
    status: createFieldStatus,
  } = trpc.form.createField.useMutation({
    onSuccess: async () => {
      await utils.form.getFields.invalidate();
    },
  });

  return {
    createFieldAsync,
    createField,
    createFieldError,
    createFieldIsPending,
    createFieldIsSuccess,
    createFieldIsError,
    createFieldIsIdle,
    createFieldStatus,
  };
};

export const useFields = (formId: string) => {
  const {
    data: fields,
    error: fieldsError,
    isLoading: fieldsIsLoading,
    isFetching: fieldsIsFetching,
    isFetched: fieldsIsFetched,
    isError: fieldsIsError,
    status: fieldsStatus,
  } = trpc.form.getFields.useQuery({ formId });

  return {
    fields,
    fieldsError,
    fieldsIsLoading,
    fieldsIsFetching,
    fieldsIsFetched,
    fieldsIsError,
    fieldsStatus,
  };
};

export const useUpdateField = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateFieldAsync,
    mutate: updateField,
    error: updateFieldError,
    isPending: updateFieldIsPending,
    isSuccess: updateFieldIsSuccess,
    isError: updateFieldIsError,
    isIdle: updateFieldIsIdle,
    status: updateFieldStatus,
  } = trpc.form.updateField.useMutation({
    onSuccess: async () => {
      await utils.form.getFields.invalidate();
    },
  });

  return {
    updateFieldAsync,
    updateField,
    updateFieldError,
    updateFieldIsPending,
    updateFieldIsSuccess,
    updateFieldIsError,
    updateFieldIsIdle,
    updateFieldStatus,
  };
};

export const useDeleteField = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: deleteFieldAsync,
    mutate: deleteField,
    error: deleteFieldError,
    isPending: deleteFieldIsPending,
    isSuccess: deleteFieldIsSuccess,
    isError: deleteFieldIsError,
    isIdle: deleteFieldIsIdle,
    status: deleteFieldStatus,
  } = trpc.form.deleteField.useMutation({
    onSuccess: async () => {
      await utils.form.getFields.invalidate();
    },
  });

  return {
    deleteFieldAsync,
    deleteField,
    deleteFieldError,
    deleteFieldIsPending,
    deleteFieldIsSuccess,
    deleteFieldIsError,
    deleteFieldIsIdle,
    deleteFieldStatus,
  };
};
