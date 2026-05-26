"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, Github } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useOAuthProviders, useOAuthSignin, useSignup } from "@/hooks/api/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const authInputClassName =
  "h-10 border-input bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/30";

function PasswordField({
  id,
  placeholder,
  disabled,
  ...props
}: React.ComponentProps<"input"> & { id: string; placeholder?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className={cn(authInputClassName, "pr-0")}>
      <InputGroupInput
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete="new-password"
        disabled={disabled}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function SocialButton({
  children,
  icon,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled}
      onClick={onClick}
      className="h-10 w-full justify-center gap-2 border-input bg-background font-normal shadow-none hover:bg-accent/60"
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
        {icon}
      </span>
      {children}
    </Button>
  );
}

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const {
    createUserWithEmailAndPasswordAsync,
    createUserWithEmailAndPasswordError,
    createUserWithEmailAndPasswordIsPending,
  } = useSignup();
  const { startOAuth } = useOAuthSignin();
  const { providers, providersIsLoading } = useOAuthProviders();

  const router = useRouter();
  const searchParams = useSearchParams();

  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting || createUserWithEmailAndPasswordIsPending;
  const googleIsAvailable = providers.includes("google");
  const githubIsAvailable = providers.includes("github");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "oauth_not_configured") {
      toast.error("This social sign-in provider is not configured.");
    } else if (error) {
      toast.error("Social sign-in failed. Please try again.");
    }
  }, [searchParams]);

  async function onSubmit(values: SignupFormValues) {
    setFormError(null);

    try {
      await createUserWithEmailAndPasswordAsync({
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        password: values.password,
      });
      router.replace("/dashboard");
      toast.success("Account created successfully");
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setFormError(message);
    }
  }

  const apiError = formError ?? createUserWithEmailAndPasswordError?.message ?? null;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Welcome! Please fill in the details to get started.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SocialButton
          disabled={providersIsLoading || isSubmitting || !googleIsAvailable}
          icon={<FcGoogle size={18} />}
          onClick={() => startOAuth("google")}
        >
          {providersIsLoading ? "Checking Google..." : "Continue with Google"}
        </SocialButton>
        <SocialButton
          disabled={providersIsLoading || isSubmitting || !githubIsAvailable}
          icon={<Github size={18} />}
          onClick={() => startOAuth("github")}
        >
          {providersIsLoading ? "Checking GitHub..." : "Continue with GitHub"}
        </SocialButton>
        {!providersIsLoading && !googleIsAvailable && !githubIsAvailable ? (
          <p className="text-center text-xs text-muted-foreground">
            Social signup is not configured in this environment. Use email and password.
          </p>
        ) : null}
      </div>

      <div className="relative flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">or</span>
        <Separator className="flex-1" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {apiError ? (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">First name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="given-name"
                      placeholder="First name"
                      disabled={isSubmitting}
                      className={authInputClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Last name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="family-name"
                      placeholder="Last name"
                      disabled={isSubmitting}
                      className={authInputClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    disabled={isSubmitting}
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
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <PasswordField
                    id="password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Confirm password</FormLabel>
                <FormControl>
                  <PasswordField
                    id="confirm-password"
                    placeholder="Confirm your password"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="mt-1 h-10 w-full font-medium"
          >
            {isSubmitting ? (
              <>
                <Spinner />
                Creating account…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="#" className="underline underline-offset-4 hover:text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="#" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
