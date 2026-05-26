import { AuthGate } from "@/components/auth/auth-gate";
import { LoginForm } from "@/custom/components/auth/login-form";
import { GalleryVerticalEnd } from "lucide-react";
import { Suspense } from "react";

export default function Page() {
  return (
    <AuthGate mode="guest">
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            NewForm
          </a>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </AuthGate>
  );
}
