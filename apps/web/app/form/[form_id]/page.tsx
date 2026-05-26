"use client";

import { use } from "react";
import { LegacyFormRedirectPage } from "@/custom/components/public-form/legacy-form-redirect-page";

type LegacyFormRouteProps = {
  params: Promise<{ form_id: string }>;
};

export default function Page({ params }: LegacyFormRouteProps) {
  const { form_id } = use(params);
  return <LegacyFormRedirectPage formId={form_id} />;
}
