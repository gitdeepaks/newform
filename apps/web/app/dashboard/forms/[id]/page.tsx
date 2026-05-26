"use client";

import { use } from "react";
import { FormBuilderPage } from "@/custom/components/forms/form-builder-page";

type FormBuilderRouteProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: FormBuilderRouteProps) {
  const { id } = use(params);
  return <FormBuilderPage formId={id} />;
}
