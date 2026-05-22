"use client";

import { useUser } from "@/hooks/api/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HomeUser() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (isLoading) {
    return <h2>User: loading...</h2>;
  }

  return <h2>User: {JSON.stringify(user, null, 2)}</h2>;
}
