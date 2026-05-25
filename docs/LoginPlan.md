# Login, Signup, and Dashboard Guard Plan

## Goal

Improve the current login flow with a simple, powerful, end-to-end type-safe approach that fits the hackathon evaluation context.

Required behavior:

1. If a user is already logged in, they should not be able to stay on `/login` or `/signup`.
2. If a user is not logged in, they should not be able to access dashboard pages.
3. After successful login or signup, the user should go to `/dashboard` and browser back should not take them back into auth forms.
4. The signup page brand text should change from `Acme Inc.` to `Newcode`.
5. The solution should stay simple, type-safe, and avoid casts.

## Current Auth Setup

Current auth is custom and based on TRPC plus a JWT stored in an httpOnly cookie.

Important files:

1. `apps/web/components/login-form.tsx`
2. `apps/web/components/signup-form.tsx`
3. `apps/web/hooks/api/auth/index.ts`
4. `apps/web/app/(auth)/login/page.tsx`
5. `apps/web/app/(auth)/signup/page.tsx`
6. `apps/web/app/dashboard/page.tsx`
7. `packages/trpc/server/routes/auth/route.ts`
8. `packages/trpc/server/trpc.ts`
9. `packages/trpc/server/utils/cookie.ts`

Current backend behavior:

1. `createUserWithEmailAndPassword` creates a user, generates JWT, and sets `authentication-token` cookie.
2. `signInUserWithEmailAndPassword` validates email/password, generates JWT, and sets `authentication-token` cookie.
3. `getLoggedInUserInfo` is protected and returns logged-in user details.
4. `protectedProcedure` validates the cookie and injects `ctx.user`.

Current frontend behavior:

1. Login form calls `useSignin()` and redirects with `router.push("/dashboard")`.
2. Signup form calls `useSignup()` and redirects with `router.push("/dashboard")`.
3. `useUser()` reads current session through `trpc.auth.getLoggedInUserInfo.useQuery()`.
4. `/login` and `/signup` do not currently redirect logged-in users away.
5. `/dashboard` currently renders without a route-level auth guard.

## Design Principles

1. Keep auth status source of truth on the backend.
2. Do not read the auth cookie manually on the client because it is httpOnly.
3. Use `getLoggedInUserInfo` through TRPC as the client-side session check.
4. Avoid `as any`, broad casts, duplicated user types, and manual JSON shape assumptions.
5. Keep generic UI primitives auth-free. Do not put auth logic inside `apps/web/components/ui/sidebar.tsx`.
6. Prefer minimal changes over large structural refactors.
7. Avoid auth flicker where possible by showing a small loading state while session is being checked.

## Recommended Component: AuthGate

Create one small client component that handles both authenticated-only and guest-only pages.

Recommended file:

```txt
apps/web/components/auth/auth-gate.tsx
```

Component API:

```tsx
type AuthGateMode = "auth" | "guest";

type AuthGateProps = {
  mode: AuthGateMode;
  children: React.ReactNode;
};
```

Behavior:

1. `mode="auth"` means only logged-in users can see the children.
2. `mode="guest"` means only logged-out users can see the children.
3. While auth query is loading or not settled, render a small loading state.
4. If `mode="auth"` and user is missing, redirect to `/login` with `router.replace`.
5. If `mode="guest"` and user exists, redirect to `/dashboard` with `router.replace`.

Implementation shape:

```tsx
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

  if (!isFetched || isLoading) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Checking session...</div>;
  }

  if (mode === "auth" && !user) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Redirecting...</div>;
  }

  if (mode === "guest" && user) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Redirecting...</div>;
  }

  return children;
}
```

Notes:

1. This uses no casts.
2. This uses the existing TRPC session query.
3. `router.replace` is intentional because auth pages should not remain in browser history after successful auth or session redirect.

## Step 1: Improve `useSignin`

Current signup hook invalidates `getLoggedInUserInfo` on success, but signin hook does not.

Update file:

```txt
apps/web/hooks/api/auth/index.ts
```

Plan:

1. Add `const utils = trpc.useUtils();` inside `useSignin`.
2. Add `onSuccess` to `trpc.auth.signInUserWithEmailAndPassword.useMutation`.
3. Invalidate `utils.auth.getLoggedInUserInfo` after successful login.

Expected behavior:

1. Login updates session cache immediately.
2. `AuthGate` sees the latest session state.
3. Sidebar/user components depending on `useUser()` update correctly.

Implementation shape:

```tsx
export const useSignin = () => {
  const utils = trpc.useUtils();

  const mutation = trpc.auth.signInUserWithEmailAndPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.getLoggedInUserInfo.invalidate();
    },
  });

  // Keep existing return shape.
};
```

Keep the existing return names to avoid unnecessary refactors.

## Step 2: Guard `/login`

Update file:

```txt
apps/web/app/(auth)/login/page.tsx
```

Wrap the login form with `AuthGate mode="guest"`.

Before:

```tsx
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
```

After:

```tsx
import { AuthGate } from "@/components/auth/auth-gate";
import { LoginForm } from "@/components/login-form";

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
```

Expected result:

1. Logged-out user sees login form.
2. Logged-in user is redirected to `/dashboard`.
3. Login form does not flash for logged-in users after session query resolves.

## Step 3: Guard `/signup` and Rename Brand

Update file:

```txt
apps/web/app/(auth)/signup/page.tsx
```

Changes:

1. Wrap page with `AuthGate mode="guest"`.
2. Replace `Acme Inc.` with `Newcode`.

Expected result:

1. Logged-out user sees signup form.
2. Logged-in user is redirected to `/dashboard`.
3. Signup brand is correct for the project.

Implementation shape:

```tsx
import { AuthGate } from "@/components/auth/auth-gate";
import { GalleryVerticalEnd } from "lucide-react";

import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <AuthGate mode="guest">
      <div className="flex min-h-svh items-center justify-center p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-8">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Newcode
          </a>
          <SignupForm />
        </div>
      </div>
    </AuthGate>
  );
}
```

## Step 4: Use `router.replace` After Login and Signup

Update files:

```txt
apps/web/components/login-form.tsx
apps/web/components/signup-form.tsx
```

Current behavior uses:

```tsx
router.push("/dashboard");
```

Change to:

```tsx
router.replace("/dashboard");
```

Reason:

1. After login/signup, auth forms should not stay in browser history.
2. Browser back should not take users back into `/login` or `/signup`.
3. Even if back navigation happens, `AuthGate mode="guest"` will redirect again.

Expected result:

1. Cleaner UX.
2. More deterministic evaluation behavior.
3. No extra state needed.

## Step 5: Protect Dashboard Pages

Question: should dashboard page change if user is already logged in, or should it simply redirect?

Answer:

1. If user is logged in and opens `/dashboard`, dashboard should render normally.
2. If user is not logged in and opens `/dashboard`, redirect to `/login`.
3. Dashboard should not redirect logged-in users anywhere else.

Recommended minimal approach:

Wrap dashboard pages with `AuthGate mode="auth"`.

Dashboard files to protect:

```txt
apps/web/app/dashboard/page.tsx
apps/web/app/dashboard/forms/page.tsx
apps/web/app/dashboard/forms/[id]/page.tsx
apps/web/app/dashboard/forms/[id]/submissions/page.tsx
```

Minimal page-level implementation:

```tsx
import { AuthGate } from "@/components/auth/auth-gate";

export default function Page() {
  return (
    <AuthGate mode="auth">
      {/* existing dashboard UI */}
    </AuthGate>
  );
}
```

Why page-level guard first:

1. It is simple and low risk.
2. It avoids a broad dashboard layout refactor.
3. It fits the current code where each dashboard page owns its sidebar/header shell.

Better long-term option:

Create `apps/web/app/dashboard/layout.tsx`, move the shared sidebar/header shell there, and guard once at layout level.

Do not do this first unless there is time because it is a larger refactor.

## Step 6: Clean Dashboard Auth-Related Content

Update file:

```txt
apps/web/app/dashboard/page.tsx
```

Current issue:

The dashboard page includes a `Demo credentials` card and an `Open login` button. This is confusing after dashboard becomes protected because a logged-in dashboard should not prompt the user to open login.

Recommended minimal change:

1. Remove the `Open login` button.
2. Change the card from `Demo credentials` to something useful for logged-in users.

Suggested replacement:

```txt
AI Evaluation Engine
```

Suggested card copy:

```txt
Run forms, collect submissions, evaluate responses, and monitor long-running task output from the creator dashboard.
```

Why this matters:

1. Hackathon judges should see the product story, not demo-login plumbing.
2. It avoids an auth contradiction: dashboard is protected but still links to login.
3. It makes the page feel production-oriented.

## Step 7: Keep Sidebar Auth Separate

Do not put login guard or logout logic inside:

```txt
apps/web/components/ui/sidebar.tsx
```

Reason:

1. That file is a reusable UI primitive.
2. It should not know about TRPC, router, cookies, or auth state.
3. Auth-specific behavior belongs in sidebar consumers like `AppSidebar` or `NavUser`.

Logout should be implemented separately in:

```txt
apps/web/components/nav-user.tsx
apps/web/hooks/api/auth/index.ts
packages/trpc/server/routes/auth/route.ts
```

That is outside this login/signup guard plan but should follow the same rule: business logic stays out of UI primitives.

## Step 8: Error Handling and Loading States

For `AuthGate`, keep loading states small and deterministic.

Recommended loading UI:

```tsx
<div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
  Checking session...
</div>
```

Recommended redirect UI:

```tsx
<div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
  Redirecting...
</div>
```

Avoid:

1. Throwing errors from auth guard UI.
2. Parsing cookie manually.
3. Rendering protected dashboard while session query is unknown.
4. Rendering auth forms while session query is unknown.

## Step 9: Type Safety Checklist

The implementation should satisfy this checklist:

1. No `as any`.
2. No manual `User` type duplication unless needed.
3. No manual cookie reads in client components.
4. No localStorage/sessionStorage auth state.
5. No broad type assertions.
6. Auth state comes from `useUser()`.
7. Redirect modes are a literal union: `"auth" | "guest"`.
8. Existing TRPC inference stays intact.
9. Existing hook return names are preserved to avoid broad refactors.

## Step 10: Manual Verification Checklist

Run through these cases after implementation:

1. Logged-out user opens `/login`: login form appears.
2. Logged-out user opens `/signup`: signup form appears.
3. `/signup` shows `Newcode`, not `Acme Inc.`.
4. Logged-out user opens `/dashboard`: redirects to `/login`.
5. Logged-out user opens `/dashboard/forms`: redirects to `/login`.
6. Logged-in user opens `/login`: redirects to `/dashboard`.
7. Logged-in user opens `/signup`: redirects to `/dashboard`.
8. Successful login redirects to `/dashboard` with `router.replace`.
9. Successful signup redirects to `/dashboard` with `router.replace`.
10. Browser back after login does not keep the user on `/login`.
11. Browser back after signup does not keep the user on `/signup`.
12. Dashboard does not show an `Open login` CTA.
13. TypeScript passes without casts.
14. No reusable UI primitive has auth logic added.

## Final Recommended Scope for First PR

Implement these changes first:

1. Add `AuthGate`.
2. Update `useSignin` cache invalidation.
3. Guard `/login` with `mode="guest"`.
4. Guard `/signup` with `mode="guest"`.
5. Rename signup brand to `Newcode`.
6. Change login/signup success navigation to `router.replace("/dashboard")`.
7. Guard dashboard pages with `mode="auth"`.
8. Remove or replace dashboard `Open login` CTA.

Leave these for the next PR:

1. Sidebar logout.
2. Google social login.
3. GitHub social login.
4. Dashboard layout refactor.
5. Server-side middleware auth guard.

This keeps the first implementation small, robust, easy to review, and strong enough for detailed hackathon evaluation.
