"use client";

import { use } from "react";
import { PublicFormPage } from "@/custom/components/public-form/public-form-page";

type PublicSlugRouteProps = {
  params: Promise<{ slug: string }>;
};

export default function Page({ params }: PublicSlugRouteProps) {
  const { slug } = use(params);
  return <PublicFormPage slug={slug} />;
}
