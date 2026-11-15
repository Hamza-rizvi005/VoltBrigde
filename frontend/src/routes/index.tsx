import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

import { SolarHome } from "@/components/SolarHome";
import { useReveal } from "@/hooks/use-reveal";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Volt Bridge — Plan your home solar & battery around power cuts" },
      { name: "description", content: "A simple daily energy plan for homes with solar, small batteries and frequent power cuts. Know when to run appliances and how long backup may last." },
      { property: "og:title", content: "Volt Bridge — Home solar energy planning" },
      { property: "og:description", content: "Daily energy plans, backup estimates, appliance schedules and a plain-English assistant for solar homes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { title: "Daily energy plan", body: "See today's estimated solar, your battery level and what your home is likely to use — in one simple view." },
  { title: "Backup estimates", body: "Know roughly how long your battery may keep the fridge, fans and lights running during a cut." },
  { title: "Appliance schedules", body: "Get suggestions to run the washer, iron or pump while the sun is doing the work." },
  { title: "Power-cut planning", body: "Add expected cuts and see if your stored energy can cover them before they happen." },
  { title: "Event planning", body: "Hosting a gathering? Plan extra lights, fans or cooking and see if energy will be enough." },
  { title: "Plain-English assistant", body: "Ask \"Can I run the AC tonight?\" and explore example guidance. A live AI service is not connected yet." },
];

const steps = [
  ["Tell us about your home", "Panels, inverter, battery and the appliances you use."],
  ["Add expected power cuts", "Your usual load-shedding times, or ones announced for today."],
  ["Follow your daily plan", "Clear suggestions and alerts — you stay in control of every switch."],
];

const sectionLinks = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "demo", label: "Demo" },
  { id: "faq", label: "FAQ" },
];
const featureRoutes = ["/app/dashboard", "/app/dashboard", "/app/appliances", "/app/power-cuts", "/app/events", "/app/assistant"] as const;
const faqs = [
  ["Will this increase my battery capacity?", "No. Volt Bridge helps you plan around the energy you have. If your appliances need more energy than is available, the plan should show the shortfall."],
  ["Does it switch appliances off automatically?", "No. This version offers planning guidance. You decide when to use each appliance and remain in control of every switch."],
  ["Can I start without connecting my inverter?", "Yes. Enter your equipment, appliances and expected power cuts to explore estimated plans. This demo does not connect to your inverter."],
  ["Will it work with my solar system?", "Manual planning is available in this demo. Future live readings will depend on your exact inverter model and a supported connection; not every system can be connected."],
  ["Are backup times guaranteed?", "No. They are estimates based on your inputs. Actual battery condition, changing appliance use and solar production can change how long backup lasts."],
];

function Landing() {
  useReveal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  return (
    <div className="relative landing-page" id="top">

      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm lg:flex">
            {sectionLinks.map(({ id, label }) => <a key={id} href={`#${id}`} className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">

            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login">Log in</Link></Button>
            <Button asChild size="sm" className="hidden bg-sun glow-sun sm:inline-flex"><Link to="/register">Get started</Link></Button>
            <Button ref={menuButton} variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
        </div>
        {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute inset-x-0 top-full border-b border-border bg-background p-5 shadow-xl lg:hidden">
          {sectionLinks.map(({ id, label }) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm hover:bg-accent">{label}</a>)}
          <div className="mt-3 flex gap-3 border-t border-border pt-4">
            <Button asChild variant="outline"><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link></Button>
            <Button asChild className="bg-sun"><Link to="/register" onClick={() => setMenuOpen(false)}>Get started</Link></Button>
          </div>
        </nav>}
      </header>

      <section className="landing-hero mx-auto max-w-6xl px-5">
        <div className="hero-copy animate-rise">
          <div className="eyebrow"><span /> A LITTLE PLANNING. MORE PEACE OF MIND.</div>
          <h1>Your sunshine.<br />Your home.<br /><span>A better plan.</span></h1>
          <p>Solar is only half the story. Know when to run your appliances and what to save for the next power cut.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-sun"><Link to="/app/dashboard">Explore your energy plan <ArrowRight size={17}/></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/app/setup">Set up my home</Link></Button>
          </div>
          <div className="hero-footnote"><span className="status-dot"/> Try the demo · No inverter connection needed</div>
        </div>
        <SolarHome />
      </section>
      <div className="home-principles mx-auto max-w-6xl px-5">
        <div><span>01 / USE THE SUN</span><p>Give busy appliances their moment.</p></div>
        <div><span>02 / SAVE YOUR BACKUP</span><p>Keep energy for what matters.</p></div>
        <div><span>03 / PLAN AHEAD</span><p>Be ready for cuts and busy evenings.</p></div>
      </div>

      <section id="features" aria-label="Features" className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="reveal max-w-2xl text-3xl font-semibold md:text-5xl">Less guesswork. A more considered day.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className="reveal glass landing-feature rounded-2xl p-6" style={{ transitionDelay: `${i * 60}ms` }}>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              <Link to={featureRoutes[i] ?? "/app/dashboard"} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" aria-label={`Explore ${f.title.toLowerCase()} in the demo`}>Explore in demo <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" aria-label="How it works" className="mx-auto max-w-6xl px-5 py-24">
        <div className="reveal glass rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-semibold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map(([t, b], i) => (
              <div key={t}>
                <div className="font-display text-5xl font-semibold text-sun">0{i + 1}</div>
                <h3 className="mt-2 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
          <svg viewBox="0 0 600 40" className="mt-10 w-full text-primary">
            <path d="M10 20 H590" stroke="currentColor" strokeWidth="2" fill="none" className="animate-flow" />
          </svg>
        </div>
      </section>

      <section id="demo" aria-label="Explore the demo" className="mx-auto max-w-6xl px-5 py-24">
        <div className="reveal mb-10 max-w-2xl">
          <span className="text-sm font-medium text-primary">Try it before you set up your home</span>
          <h2 className="mt-3 text-3xl font-semibold md:text-5xl">See your day with a plan.</h2>
          <p className="mt-4 text-muted-foreground">Explore a sample household, change appliance details, or plan for guests tonight. The demo uses sample data and estimates; no account or solar connection is needed.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-sun"><Link to="/app/dashboard">Open demo dashboard</Link></Button>
            <Button asChild variant="outline"><Link to="/app/events">Try event planning</Link></Button>
          </div>
        </div>
        <div className="reveal grid gap-6 md:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h3 className="mt-3 text-xl font-semibold">Estimates vs. live readings</h3>
            <p className="mt-2 text-sm text-muted-foreground">This prototype uses demo data and your manual inputs. Live readings are not connected yet; future availability will depend on your inverter and a supported connection.</p>
          </div>
          <div className="glass rounded-2xl p-6">
            <h3 className="mt-3 text-xl font-semibold">Honest by design</h3>
            <p className="mt-2 text-sm text-muted-foreground">Volt Bridge gives advice — it doesn't switch your appliances, and backup times are estimates, never guarantees.</p>
          </div>
        </div>
      </section>

      <section id="faq" aria-label="Frequently asked questions" className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-3xl font-semibold md:text-5xl">A few things worth knowing.</h2>
        <div className="mt-8 space-y-3">
          {faqs.map(([question, answer]) => <details key={question} className="glass rounded-2xl p-5">
            <summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{question}</summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </details>)}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-32 pt-12 text-center">
        <h2 className="reveal text-4xl font-semibold md:text-6xl">Ready for the next power cut?</h2>
        <Button asChild size="lg" className="reveal mt-8 bg-sun glow-sun"><Link to="/app/setup">Explore the home planner</Link></Button>
      </section>

      <footer className="border-t border-border/50 bg-background/80 py-8 text-center text-xs text-muted-foreground">
        <nav aria-label="Footer navigation" className="mb-5 flex flex-wrap justify-center gap-5">
          {sectionLinks.map(({ id, label }) => <a key={id} href={`#${id}`} className="hover:text-foreground hover:underline">{label}</a>)}
          <a href="#top" className="hover:text-foreground hover:underline">Back to top</a>
        </nav>
        © 2026 Volt Bridge · Planning guidance only — not a control system.
      </footer>
    </div>
  );
}

