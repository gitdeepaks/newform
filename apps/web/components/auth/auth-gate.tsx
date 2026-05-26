"use client";

import { useUser } from "@/hooks/api/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type AuthGateMode = "auth" | "guest";

type AuthGateProps = {
  mode: AuthGateMode;
  children: React.ReactNode;
};

export function AuthGate({ mode, children }: AuthGateProps) {
  const router = useRouter();
  const { user, isFetched, isLoading } = useUser();

  useEffect(() => {
    if (!isFetched) return;

    if (mode === "auth" && !user) {
      router.replace("/login");
      return;
    }

    if (mode === "guest" && user) {
      router.replace("/dashboard");
    }
  }, [isFetched, mode, router, user]);

  if (mode === "guest" && (!isFetched || isLoading)) {
    return children;
  }

  if (!isFetched || isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Checking session...
      </div>
    );
  }

  if (mode === "auth" && !user) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Redirecting...
      </div>
    );
  }

  if (mode === "guest" && user) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Redirecting...
      </div>
    );
  }

  return children;
}
