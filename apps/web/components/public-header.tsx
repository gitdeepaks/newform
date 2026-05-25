import Link from "next/link";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/82 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 text-foreground">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary font-black text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:-rotate-6">
            N
          </span>
          <span className="text-xl font-black tracking-[-0.04em]">Newform</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          <Link href="/templates" className="transition-colors hover:text-foreground">
            Templates
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button asChild size="sm" className="rounded-full px-4">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
