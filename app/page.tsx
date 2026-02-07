import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Brain, CheckCircle } from "lucide-react";
import { CodexTrailBackground } from "@/components/landing/codex-trail-background";

export default function Home() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-white/70" />
              <span className="text-xl font-bold">scoraxAI</span>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative min-h-[100vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
          <CodexTrailBackground />
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <div
  role="button"
  tabIndex={0}
  aria-label="Brain icon preview"
  className="
    mx-auto
    mb-6
    group relative h-[90px] w-[90px]
    overflow-clip rounded-[24px]
    bg-[#0b0d10]
    ring-1 ring-white/10
    shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_10px_30px_rgba(0,0,0,0.65)]
    transition duration-200
    hover:ring-white/20
    hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.75)]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
  "
>
  {/* subtle hover glow */}
  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10),transparent_60%)]" />
  </div>

  {/* your looping video */}
  <video
    className="h-full w-full object-cover scale-[1.12] contrast-[1.12] brightness-[0.92]"
    playsInline
    muted
    loop
    autoPlay
    preload="metadata"
    poster="/brain-poster.png"
  >
    <source src="https://fcwdgsfspejqfyjmazvk.supabase.co/storage/v1/object/public/web_data/79c89c5d-1cb6-43cc-b0c8-d0302186197b.mp4" type="video/mp4" />
  </video>

  {/* optional: tiny gloss highlight */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute -top-6 left-0 right-0 h-10 bg-white/5 blur-xl opacity-60" />
  </div>
</div>
              <h1 className="text-8xl font-bold mb-6 bg-gradient-to-r from-white via-white/60 to-white bg-clip-text text-transparent">
                scoraxAI
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Transform your due diligence process with advanced AI analysis.
                Get insights and make informed decisions faster.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why scoraxAI?
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-6 border border-border rounded-lg bg-card">
                <Brain className="h-12 w-12 text-white/70 mb-4" />
                <h3 className="text-xl font-semibold mb-3">AI-Powered Insights</h3>
                <p className="text-muted-foreground">
                  Get comprehensive analysis powered by advanced AI. Identify
                  risks, opportunities, and key insights automatically.
                </p>
              </div>

              <div className="p-6 border border-border rounded-lg bg-card">
                <CheckCircle className="h-12 w-12 text-white/70 mb-4" />
                <h3 className="text-xl font-semibold mb-3">Structured Process</h3>
                <p className="text-muted-foreground">
                  Follow a proven due diligence workflow. From project setup to
                  final analysis, every step is guided and tracked.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Transform Your Due Diligence?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join leading investors and analysts using AI to make better,
              faster decisions.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Get Started Today</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} scoraxAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}