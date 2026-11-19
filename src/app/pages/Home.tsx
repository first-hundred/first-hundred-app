import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

const WORDS = ["customers", "investors", "hires"] as const;
const PILLS = [
  { goal: "customers", label: "Customers" },
  { goal: "investors", label: "Investors" },
  { goal: "hires", label: "Hires" },
] as const;

export default function Home() {
  const [i, setI] = useState(0);
  // Width of the word on screen; it eases between words so the whole line stays centred.
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const [w, setW] = useState<number | undefined>(undefined);
  const iso = typeof window === "undefined" ? useEffect : useLayoutEffect;
  iso(() => {
    const measure = () => setW(refs.current[i]?.offsetWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [i]);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 pb-[6vh]">
      <h1 className="text-center text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[84px]">
        Find your first 100{" "}
        <span className="relative inline-block whitespace-nowrap align-bottom transition-[width] duration-700 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ width: w }}>
          {WORDS.map((word, n) => (
            <span key={word} ref={(el) => { refs.current[n] = el; }} aria-hidden={n !== i}
              className={`fh-word ${n === i ? "relative" : "absolute left-1/2 top-0 -translate-x-1/2"}`} data-on={n === i ? "" : undefined}>
              {word}
            </span>
          ))}
        </span>
      </h1>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:mt-16">
        {PILLS.map((p) => (
          <Link key={p.goal} to="/interview" search={{ goal: p.goal }} className="fh-pill">
            {p.label}
          </Link>
        ))}
      </div>
      <Link to="/leads" search={{ demo: 1 }} className="mt-8 text-sm text-grain underline-offset-4 hover:text-ink hover:underline">See an example</Link>
    </main>
  );
}
