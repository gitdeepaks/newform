import Link from "next/link";

import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  ["03", "seeded templates"],
  ["20+", "demo responses"],
  ["09", "field types"],
  ["CSV", "export ready"],
];

const flow = [
  ["Create", "Shape fields with a Typeform-style builder."],
  ["Theme", "Apply a clean public-page visual system."],
  ["Publish", "Share public or unlisted links instantly."],
  ["Analyze", "Review responses, charts, and CSV exports."],
];

const templates = [
  ["Anime Convention Feedback", "Audience experience and event ratings."],
  ["Startup Product-Market Fit Survey", "Signal-heavy product feedback loop."],
  ["Gaming Tournament Registration", "Player intake with structured fields."],
];

const features = [
  "Public and unlisted forms",
  "Server-side response validation",
  "Theme-ready public pages",
  "Responses, analytics, and CSV",
  "Honeypot and rate limiting",
  "Demo-ready seeded data",
];

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <PublicHeader />

      <section className="relative border-b">
        <div className="monokai-grid absolute inset-0 opacity-55" />
        <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-primary/14 blur-3xl" />
        <div className="absolute bottom-10 right-[10%] h-80 w-80 rounded-full bg-accent/16 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-7 rounded-full bg-card/75 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Newform / Builder / Analytics
            </Badge>
            <h1 className="text-balance text-5xl font-black leading-[0.92] tracking-[-0.075em] sm:text-6xl lg:text-7xl xl:text-8xl">
              Forms that feel fast, focused, finished.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              Create, publish, validate, analyze, and export responses from one polished Typeform-style builder.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base font-bold">
                <Link href="/signup">Start building</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-card/75 px-6 text-base font-bold">
                <Link href="/templates">View templates</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:mr-0">
            <div className="absolute -left-5 top-8 z-10 hidden rounded-full border bg-card/90 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-chart-2 shadow-xl md:block">
              validated
            </div>
            <div className="absolute -right-4 bottom-16 z-10 hidden rounded-full border bg-card/90 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-accent shadow-xl md:block">
              csv export
            </div>
            <div className="rounded-[2rem] border bg-card/82 p-3 shadow-2xl shadow-primary/10 backdrop-blur md:rounded-[2.75rem] md:p-5">
              <div className="rounded-[1.5rem] border bg-background p-5 md:rounded-[2rem] md:p-7">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <Badge className="mb-4 rounded-full px-3">Analytics ready</Badge>
                    <h2 className="max-w-md text-2xl font-black leading-tight tracking-[-0.04em] md:text-3xl">
                      How was your launch experience?
                    </h2>
                  </div>
                  <div className="hidden rounded-2xl border bg-card px-3 py-2 font-mono text-xs text-muted-foreground sm:block">
                    02/03
                  </div>
                </div>
                <div className="mb-6 h-2 rounded-full bg-muted">
                  <div className="h-full w-[68%] rounded-full bg-primary" />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <div key={rating} className="rounded-2xl border bg-card py-4 text-center text-lg font-black shadow-sm">
                      {rating}
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-3xl border bg-card p-4 text-sm text-muted-foreground">
                  What should we improve next?
                  <div className="mt-3 rounded-2xl bg-muted px-4 py-4 font-semibold text-foreground">Response analytics</div>
                </div>
                <Button className="mt-5 h-12 w-full rounded-2xl text-base font-black">Submit response</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-card/55">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map(([value, label]) => (
            <div key={label} className="py-7 md:py-9">
              <div className="font-mono text-4xl font-black tracking-[-0.06em] text-primary">{value}</div>
              <div className="mt-1 text-sm font-medium text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <Badge variant="outline" className="mb-4 rounded-full bg-card/70 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
              Creator loop
            </Badge>
            <h2 className="text-4xl font-black leading-none sm:text-5xl">From blank form to insight.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {flow.map(([step, copy], index) => (
              <Card key={step} className="bg-card/72 transition-transform hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="mb-8 font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">0{index + 1}</div>
                  <h3 className="text-2xl font-black">{step}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-sidebar text-sidebar-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-24">
          <div>
            <Badge className="mb-5 rounded-full bg-accent text-accent-foreground">Feature complete slice</Badge>
            <h2 className="text-4xl font-black leading-none sm:text-5xl">Built for the full creator loop.</h2>
            <p className="mt-5 max-w-md text-muted-foreground">
              No fake checkout. The demo stays focused on creation, publishing, validation, responses, analytics, and exports.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-3xl border bg-card/45 p-5 font-semibold shadow-sm">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="max-w-2xl text-4xl font-black leading-none sm:text-5xl">Templates with a head start.</h2>
            <p className="mt-4 text-muted-foreground">Static preview cards here. The Templates page shows real seeded public forms.</p>
          </div>
          <Button asChild variant="outline" className="w-fit rounded-full bg-card/75">
            <Link href="/templates">Browse templates</Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {templates.map(([name, copy]) => (
            <Card key={name} className="bg-card/72">
              <CardContent className="p-6">
                <div className="mb-8 h-24 rounded-3xl border bg-muted/70 monokai-noise" />
                <h3 className="text-xl font-black">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 overflow-hidden bg-card/78">
          <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <h2 className="text-3xl font-black">Try the full creator loop</h2>
              <p className="mt-2 text-muted-foreground">Demo credentials: demo@example.com / password123</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full">
                <Link href="/login">Log in to demo</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full bg-background">
                <Link href="/signup">Create account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
