"use client";

import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { AuthGate } from "@/components/auth/auth-gate";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useForms } from "@/hooks/api/form";

const chartBars = [52, 35, 42, 68, 74, 61, 88, 79, 96, 72, 64, 91];

function formatRelativeDate(value: Date | string | null) {
  if (!value) return "-";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 60) return `${diffMinutes || 1}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Page() {
  const { forms, formsError, formsIsLoading } = useForms();
  const activeForms = forms?.filter((form) => form.status !== "archived").length ?? 0;
  const recentForms = forms?.slice(0, 5) ?? [];
  const metrics = [
    ["Total responses", "--", "--", "Across published forms"],
    ["Completion rate", "--", "--", "Visitors who finished"],
    ["Active forms", activeForms.toString(), "Live", "Public and unlisted"],
    ["CSV exports", "--", "--", "Downloaded this month"],
  ];

  return (
    <AuthGate mode="auth">
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
            <div className="monokai-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 p-4 md:p-6">
              <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <Badge className="mb-4 rounded-full bg-accent text-accent-foreground">Creator dashboard</Badge>
                  <h1 className="text-4xl font-black leading-none tracking-[-0.065em] md:text-5xl">
                    Form performance at a glance.
                  </h1>
                  <p className="mt-4 max-w-2xl text-muted-foreground">
                    Track published forms, response volume, completion quality, and exports from one focused workspace.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  <Button asChild className="h-10 rounded-full font-bold">
                    <Link href="/dashboard/forms">Manage forms</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-10 rounded-full bg-card/80 font-bold">
                    <Link href="/templates">Browse templates</Link>
                  </Button>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(([label, value, delta, copy]) => (
                  <Card key={label} className="bg-card/78 backdrop-blur">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-muted-foreground">{label}</p>
                        <Badge variant="outline" className="rounded-full bg-background/60 font-mono text-[11px] text-chart-2">
                          {delta}
                        </Badge>
                      </div>
                      <div className="mt-5 font-mono text-4xl font-black tracking-[-0.08em]">{value}</div>
                      <p className="mt-3 text-sm text-muted-foreground">{copy}</p>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <Card className="overflow-hidden bg-card/78 backdrop-blur">
                  <CardHeader className="flex flex-col gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-2xl font-black tracking-[-0.04em]">Response trend</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">Submissions across the last 12 weeks</p>
                    </div>
                    <div className="flex rounded-full border bg-background/70 p-1 text-xs font-semibold">
                      <span className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">12 weeks</span>
                      <span className="px-3 py-1.5 text-muted-foreground">30 days</span>
                      <span className="px-3 py-1.5 text-muted-foreground">7 days</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 md:p-7">
                    <div className="relative h-72 overflow-hidden rounded-[1.75rem] border bg-background/72 p-5">
                      <div className="absolute inset-x-5 top-1/4 border-t border-border/70" />
                      <div className="absolute inset-x-5 top-1/2 border-t border-border/70" />
                      <div className="absolute inset-x-5 top-3/4 border-t border-border/70" />
                      <svg className="relative h-full w-full" viewBox="0 0 720 240" role="img" aria-label="Response trend area chart">
                        <defs>
                          <linearGradient id="responseFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.03" />
                          </linearGradient>
                          <linearGradient id="completionFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d="M0 174 C70 118 100 64 166 92 C235 122 236 200 324 164 C406 130 430 46 506 74 C590 104 594 196 720 92 L720 240 L0 240 Z" fill="url(#responseFill)" />
                        <path d="M0 174 C70 118 100 64 166 92 C235 122 236 200 324 164 C406 130 430 46 506 74 C590 104 594 196 720 92" fill="none" stroke="var(--primary)" strokeWidth="3" />
                        <path d="M0 198 C78 162 122 145 184 160 C265 180 302 150 374 132 C454 112 498 116 552 150 C608 184 656 176 720 146 L720 240 L0 240 Z" fill="url(#completionFill)" />
                        <path d="M0 198 C78 162 122 145 184 160 C265 180 302 150 374 132 C454 112 498 116 552 150 C608 184 656 176 720 146" fill="none" stroke="var(--chart-2)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-sidebar text-sidebar-foreground">
                  <CardHeader>
                    <CardTitle className="text-2xl font-black tracking-[-0.04em]">This week</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {chartBars.map((height, index) => (
                      <div key={index} className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">W{index + 1}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${height}%` }} />
                        </div>
                        <span className="text-right font-mono text-xs">{height}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>

              <Card className="overflow-hidden bg-card/78 backdrop-blur">
                <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black tracking-[-0.04em]">Recent forms</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Live product flow checkpoints for demo review</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-fit rounded-full bg-background/70">
                    <Link href="/dashboard/forms">Open forms</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-muted/55 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        <tr>
                          <th className="px-5 py-4 font-bold">Form</th>
                          <th className="px-5 py-4 font-bold">Status</th>
                          <th className="px-5 py-4 font-bold">Responses</th>
                          <th className="px-5 py-4 font-bold">Completion</th>
                          <th className="px-5 py-4 font-bold">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formsIsLoading ? (
                          <tr className="border-t">
                            <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                              <span className="inline-flex items-center gap-2">
                                <Spinner />
                                Loading forms...
                              </span>
                            </td>
                          </tr>
                        ) : formsError ? (
                          <tr className="border-t">
                            <td colSpan={5} className="px-5 py-8 text-center text-destructive">
                              {formsError.message}
                            </td>
                          </tr>
                        ) : recentForms.length > 0 ? (
                          recentForms.map((form) => (
                            <tr key={form.id} className="border-t transition-colors hover:bg-muted/35">
                              <td className="px-5 py-4 font-semibold">
                                <Link href={`/dashboard/forms/${form.id}`} className="hover:underline">
                                  {form.title}
                                </Link>
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={form.status === "draft" ? "outline" : "default"} className="rounded-full">
                                  {form.status}
                                </Badge>
                              </td>
                              <td className="px-5 py-4 font-mono font-bold">--</td>
                              <td className="px-5 py-4 font-mono">--</td>
                              <td className="px-5 py-4 text-muted-foreground">{formatRelativeDate(form.updatedAt ?? form.createdAt)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t">
                            <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                              No forms yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
