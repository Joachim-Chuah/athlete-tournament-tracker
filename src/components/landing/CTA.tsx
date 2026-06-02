"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

const CTA = () => {
  const router = useRouter();

  return (
    <section id="cta" className="border-b border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
            Stop guessing.{" "}
            <span className="italic opacity-70">Start running the numbers.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base opacity-70 md:text-lg">
            Join the athletes treating their career like the business it is. Free to start, no credit card.
          </p>

          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/login")}
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary-foreground px-6 text-sm font-medium text-primary transition-opacity hover:opacity-90"
            >
              Get early access
              <ArrowUpRight className="size-4" />
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs opacity-60">
            <span>· Tennis</span>
            <span>· Track &amp; Field</span>
            <span>· Combat sports</span>
            <span>· Golf</span>
            <span>· Cycling</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
