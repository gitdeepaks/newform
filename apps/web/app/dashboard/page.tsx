import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const quickActions = [
  ["Create", "Open forms and start a new builder draft."],
  ["Theme", "Choose a visual system for public pages."],
  ["Publish", "Share public or unlisted links."],
  ["Review", "Inspect submissions, analytics, and CSV."],
];

const demoSteps = [
  "Open seeded forms.",
  "Pick a theme.",
  "Publish or copy a link.",
  "Submit a public response.",
  "Check responses and analytics.",
];

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
          <div className="monokai-grid pointer-events-none absolute inset-0 opacity-35" />
          <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
            <Card className="overflow-hidden bg-card/80 shadow-sm backdrop-blur">
              <CardContent className="grid gap-8 p-6 lg:grid-cols-[1fr_18rem] lg:p-8">
                <div>
                  <Badge className="mb-5 rounded-full bg-accent text-accent-foreground">Creator dashboard</Badge>
                  <h1 className="max-w-3xl text-4xl font-black leading-none tracking-[-0.065em] md:text-6xl">Welcome to Newform.</h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                    Create polished forms, publish them with themes, and track responses from one dashboard.
                  </p>
                </div>
                <div className="flex flex-col justify-end gap-3">
                  <Button asChild className="h-11 rounded-full font-bold">
                    <Link href="/dashboard/forms">Manage forms</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-full bg-background font-bold">
                    <Link href="/templates">Browse templates</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <section aria-labelledby="quick-actions" className="rounded-[2rem] border bg-card/55 p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <h2 id="quick-actions" className="text-xl font-black">Quick actions</h2>
                <Link href="/dashboard/forms" className="text-sm font-medium text-primary hover:text-primary/80">
                  Go to forms
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {quickActions.map(([title, copy], index) => (
                  <Card key={title} className="bg-background/72">
                    <CardContent className="p-5">
                      <div className="mb-10 font-mono text-xs font-black uppercase tracking-[0.18em] text-primary">
                        0{index + 1}
                      </div>
                      <h3 className="text-2xl font-black">{title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="bg-sidebar text-sidebar-foreground shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Demo guide</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {demoSteps.map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                          {index + 1}
                        </span>
                        <span className="pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-card/80">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">Demo credentials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>Use these credentials to test the creator flow quickly.</p>
                  <div className="rounded-2xl border bg-background p-4 font-mono text-foreground">
                    <div>demo@example.com</div>
                    <div>password123</div>
                  </div>
                  <Button asChild variant="outline" className="rounded-full bg-background">
                    <Link href="/login">Open login</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
