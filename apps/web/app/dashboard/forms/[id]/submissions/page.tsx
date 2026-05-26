"use client";

import { use } from "react";
import { ResponsesPage } from "@/custom/components/responses/responses-page";

type ResponsesRouteProps = {
  params: Promise<{ id: string }>;
};

export default function Page({ params }: ResponsesRouteProps) {
  const { id } = use(params);
  return <ResponsesPage formId={id} />;
}
