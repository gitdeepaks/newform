import Link from "next/link";

import { PublicHeader } from "@/components/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "$0",
    copy: "For creators testing ideas and collecting lightweight feedback.",
    features: ["3 forms", "100 responses/month", "Public templates", "Basic analytics", "CSV export"],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "$19/mo",
    copy: "For teams and creators who publish forms regularly.",
    features: ["Unlimited forms", "10k responses/month", "Themes", "Public and unlisted links", "Advanced analytics", "CSV export"],
    cta: "Start Pro",
    recommended: true,
  },
  {
    name: "Team",
    price: "Custom",
    copy: "For organizations that need brand control and collaborative workflows.",
    features: ["Team workspace", "Custom branding", "Priority support", "Higher response limits", "Admin controls planned"],
    cta: "Contact sales",
  },
];

const faqs = [
  ["Is payment implemented?", "Payments are planned for this demo; signup routes you into the working product flow."],
  ["Can I export responses?", "Yes. Response tables include CSV export for collected submissions."],
  ["Can I publish unlisted forms?", "Yes. Forms can be published as public or unlisted links."],
  ["Can I use templates?", "Yes. Public seeded templates are available from the Templates page."],
];

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <PublicHeader />

      <section className="relative border-b">
        <div className="monokai-grid absolute inset-0 opacity-50" />
        <div className="absolute left-1/2 top-16 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-24">
          <Badge className="mb-6 rounded-full bg-accent text-accent-foreground">Demo pricing, honest scope</Badge>
          <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-[-0.075em] sm:text-6xl lg:text-7xl">
            Simple pricing for every form journey.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Start free, upgrade when your forms become part of your workflow. Payment checkout is planned, not faked.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-16">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative overflow-hidden bg-card/78 ${plan.recommended ? "border-primary shadow-2xl shadow-primary/10 ring-2 ring-primary" : ""}`}
          >
            {plan.recommended && <div className="absolute inset-x-0 top-0 h-1 bg-primary" />}
            <CardContent className="flex min-h-[30rem] flex-col p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black">{plan.name}</h2>
                {plan.recommended && <Badge className="rounded-full">Recommended</Badge>}
              </div>
              <div className="mt-8 font-mono text-5xl font-black tracking-[-0.08em]">{plan.price}</div>
              <p className="mt-5 min-h-12 text-sm leading-6 text-muted-foreground">{plan.copy}</p>
              <ul className="mt-8 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="font-mono font-black text-chart-2">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-auto h-11 rounded-full font-bold">
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border-t bg-card/45">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
          <div>
            <Badge variant="outline" className="mb-4 rounded-full bg-background/70 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
              FAQ
            </Badge>
            <h2 className="text-4xl font-black leading-none">No billing theatre.</h2>
            <p className="mt-4 text-muted-foreground">The pricing page makes the product feel complete without pretending checkout exists.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map(([question, answer]) => (
              <Card key={question} className="bg-background/70">
                <CardContent className="p-6">
                  <h3 className="font-black">{question}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
