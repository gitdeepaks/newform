"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useOAuthProviders, useOAuthSignin, useSignin } from "@/hooks/api/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";

type LoginFormValues = {
  email: string;
  password: string;
};

const authInputClassName =
  "h-10 border-input bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/30";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const { signInUserWithEmailAndPasswordAsync, signInUserWithEmailAndPasswordIsPending } =
    useSignin();
  const { startOAuth } = useOAuthSignin();
  const { providers, providersIsLoading } = useOAuthProviders();
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleIsAvailable = providers.includes("google");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "oauth_not_configured") {
      toast.error("This social sign-in provider is not configured.");
    } else if (error) {
      toast.error("Social sign-in failed. Please try again.");
    }
  }, [searchParams]);

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const { id } = await signInUserWithEmailAndPasswordAsync({
        email: values.email,
        password: values.password,
      });

      if (id) {
        router.replace("/dashboard");
        toast.success("Login successful");
      }
    } catch {
      toast.error("Invalid email or password");
    }
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Login to your account</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Please enter your details to continue.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={providersIsLoading || !googleIsAvailable}
          onClick={() => startOAuth("google")}
          className="h-10 w-full justify-center gap-2 border-input bg-background font-normal shadow-none hover:bg-accent/60"
        >
          <FcGoogle size={18} className="shrink-0" />
          {providersIsLoading ? "Checking Google..." : "Login with Google"}
        </Button>
        {!providersIsLoading && !googleIsAvailable ? (
          <p className="text-center text-xs text-muted-foreground">
            Social login is not configured in this environment. Use email and password.
          </p>
        ) : null}
      </div>

      <div className="relative flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    className={authInputClassName}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel className="text-sm font-medium">Password</FormLabel>
                  <Link
                    href="#"
                    className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={authInputClassName}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="mt-1 h-10 w-full font-medium"
            disabled={signInUserWithEmailAndPasswordIsPending}
          >
            {signInUserWithEmailAndPasswordIsPending ? "Signing in..." : "Continue"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
