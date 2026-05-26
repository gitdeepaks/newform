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

export const useCloneForm = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.cloneForm.useMutation({
    onSuccess: async () => {
      await utils.form.listForms.invalidate();
    },
  });

  return {
    cloneFormAsync: mutation.mutateAsync,
    cloneForm: mutation.mutate,
    cloneFormError: mutation.error,
    cloneFormIsPending: mutation.isPending,
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

export const useOwnerForm = (formId: string) => {
  const {
    data: form,
    error: formError,
    isLoading: formIsLoading,
    isFetching: formIsFetching,
    isFetched: formIsFetched,
    isError: formIsError,
    status: formStatus,
  } = trpc.form.getFormForOwner.useQuery({ formId });

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

export const usePublicForm = (slug: string) => {
  const {
    data: form,
    error: formError,
    isLoading: formIsLoading,
    isFetching: formIsFetching,
    isFetched: formIsFetched,
    isError: formIsError,
    status: formStatus,
  } = trpc.form.getPublicFormBySlug.useQuery({ slug });

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

export const usePublicRedirectById = (formId: string) => {
  const query = trpc.form.getPublicRedirectById.useQuery({ formId });

  return {
    redirectData: query.data,
    redirectError: query.error,
    redirectIsLoading: query.isLoading,
  };
};

export const usePublicForms = () => {
  const {
    data: forms,
    error: formsError,
    isLoading: formsIsLoading,
    isFetching: formsIsFetching,
    isFetched: formsIsFetched,
    isError: formsIsError,
    status: formsStatus,
  } = trpc.form.listPublicForms.useQuery();

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

export const useThemes = () => {
  const {
    data: themes,
    error: themesError,
    isLoading: themesIsLoading,
    isFetching: themesIsFetching,
  } = trpc.form.listThemes.useQuery();

  return {
    themes,
    themesError,
    themesIsLoading,
    themesIsFetching,
  };
};

export const useAssignTheme = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.assignTheme.useMutation({
    onSuccess: async () => {
      await utils.form.getFormForOwner.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
      await utils.form.listPublicForms.invalidate();
      await utils.form.listForms.invalidate();
    },
  });

  return {
    assignThemeAsync: mutation.mutateAsync,
    assignTheme: mutation.mutate,
    assignThemeError: mutation.error,
    assignThemeIsPending: mutation.isPending,
  };
};

export const useUpdateForm = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.updateForm.useMutation({
    onSuccess: async () => {
      await utils.form.getFormForOwner.invalidate();
      await utils.form.listForms.invalidate();
    },
  });

  return {
    updateFormAsync: mutation.mutateAsync,
    updateForm: mutation.mutate,
    updateFormError: mutation.error,
    updateFormIsPending: mutation.isPending,
  };
};

export const usePublishForm = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.publishForm.useMutation({
    onSuccess: async () => {
      await utils.form.getFormForOwner.invalidate();
      await utils.form.listForms.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
      await utils.form.listPublicForms.invalidate();
    },
  });

  return {
    publishFormAsync: mutation.mutateAsync,
    publishForm: mutation.mutate,
    publishFormError: mutation.error,
    publishFormIsPending: mutation.isPending,
  };
};

export const useUnpublishForm = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.unpublishForm.useMutation({
    onSuccess: async () => {
      await utils.form.getFormForOwner.invalidate();
      await utils.form.listForms.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
      await utils.form.listPublicForms.invalidate();
    },
  });

  return {
    unpublishFormAsync: mutation.mutateAsync,
    unpublishForm: mutation.mutate,
    unpublishFormError: mutation.error,
    unpublishFormIsPending: mutation.isPending,
  };
};

export const useUpdateVisibility = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.updateVisibility.useMutation({
    onSuccess: async () => {
      await utils.form.getFormForOwner.invalidate();
      await utils.form.listForms.invalidate();
      await utils.form.listPublicForms.invalidate();
    },
  });

  return {
    updateVisibilityAsync: mutation.mutateAsync,
    updateVisibility: mutation.mutate,
    updateVisibilityError: mutation.error,
    updateVisibilityIsPending: mutation.isPending,
  };
};

export const useUpdateSlug = () => {
  const utils = trpc.useUtils();
  const mutation = trpc.form.updateSlug.useMutation({
    onSuccess: async () => {
      await utils.form.getFormForOwner.invalidate();
      await utils.form.listForms.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
      await utils.form.listPublicForms.invalidate();
    },
  });

  return {
    updateSlugAsync: mutation.mutateAsync,
    updateSlug: mutation.mutate,
    updateSlugError: mutation.error,
    updateSlugIsPending: mutation.isPending,
  };
};

export const useSubmitPublicResponse = () => {
  const utils = trpc.useUtils();
  const {
    mutateAsync: submitPublicResponseAsync,
    mutate: submitPublicResponse,
    error: submitPublicResponseError,
    isPending: submitPublicResponseIsPending,
    isSuccess: submitPublicResponseIsSuccess,
    isError: submitPublicResponseIsError,
    isIdle: submitPublicResponseIsIdle,
    status: submitPublicResponseStatus,
  } = trpc.form.submitPublicResponse.useMutation({
    onSuccess: async () => {
      await utils.form.getPublicFormBySlug.invalidate();
      await utils.form.getSubmissions.invalidate();
      await utils.form.listResponses.invalidate();
      await utils.form.getFormAnalytics.invalidate();
    },
  });

  return {
    submitPublicResponseAsync,
    submitPublicResponse,
    submitPublicResponseError,
    submitPublicResponseIsPending,
    submitPublicResponseIsSuccess,
    submitPublicResponseIsError,
    submitPublicResponseIsIdle,
    submitPublicResponseStatus,
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

export const useResponses = (formId: string, page = 1) => {
  const query = trpc.form.listResponses.useQuery({ formId, page, pageSize: 20 });

  return {
    responsesData: query.data,
    responsesError: query.error,
    responsesIsLoading: query.isLoading,
    responsesIsFetching: query.isFetching,
  };
};

export const useFormAnalytics = (formId: string) => {
  const query = trpc.form.getFormAnalytics.useQuery({ formId });

  return {
    analytics: query.data,
    analyticsError: query.error,
    analyticsIsLoading: query.isLoading,
    analyticsIsFetching: query.isFetching,
  };
};

export const useExportResponsesCsv = () => {
  const mutation = trpc.form.exportResponsesCsv.useMutation();

  return {
    exportResponsesCsvAsync: mutation.mutateAsync,
    exportResponsesCsvIsPending: mutation.isPending,
    exportResponsesCsvError: mutation.error,
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
      await utils.form.getFormForOwner.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
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
      await utils.form.getFormForOwner.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
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
      await utils.form.getFormForOwner.invalidate();
      await utils.form.getPublicFormBySlug.invalidate();
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
