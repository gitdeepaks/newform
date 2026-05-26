import { AuthGate } from "@/components/auth/auth-gate";
import { LoginForm } from "@/custom/components/auth/login-form";

export default function Page() {
  return (
    <AuthGate mode="guest">
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </AuthGate>
  );
}
