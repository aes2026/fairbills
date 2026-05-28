import Link from "next/link";
import { Fraunces, Spline_Sans } from "next/font/google";
import { ArrowRight, Check, Zap } from "lucide-react";

export const metadata = {
  title: "About — FairBills",
  description:
    "FairBills is a free Australian tool that reads your power or gas bill and tells you the truth — even when the truth is 'you're fine, stay put'.",
};

// Scoped fonts: only the /about page pulls in Fraunces (serif headings) and
// Spline Sans (body). The rest of the site keeps its system font stack.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const spline = Spline_Sans({
  subsets: ["latin"],
  variable: "--font-spline",
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function AboutPage() {
  return (
    <main className={`${fraunces.variable} ${spline.variable} about-root`}>
      <style>{ABOUT_CSS}</style>

      <div className="topbar">
        <div className="wrap topbar-row">
          <Link href="/" className="logo">
            <span className="logo-mark" aria-hidden="true">
              <Zap className="logo-zap" />
            </span>
            <span className="logo-name">FairBills</span>
          </Link>
          <Link href="/" className="nav-back">
            ← Back to checking bills
          </Link>
        </div>
      </div>

      <div className="hero">
        <div className="wrap">
          <div className="kicker fade d1">The whole story</div>
          <h1 className="fade d2">
            We got sick of being
            <br />
            <em>quietly ripped off.</em>
          </h1>
          <p className="hero-sub fade d3">
            So we built a free tool that reads your bill, does the maths the energy companies hope
            you never do, and tells you the truth. That&rsquo;s the whole business plan.
          </p>
        </div>
      </div>

      <div className="wrap">
        <section>
          <p className="lead">The longer you stay with a retailer, the more you tend to pay.</p>
          <p>
            They dress it up — &ldquo;standing offer,&rdquo; &ldquo;rollover rate,&rdquo;
            &ldquo;your current plan.&rdquo; We call it the <strong>loyalty tax</strong>. New
            customers get the shiny discount; the loyal ones get quietly shuffled onto something
            dearer. The fix is genuinely easy — a five-minute call, a quick switch — but the whole
            system is built to make checking feel like more hassle than it&rsquo;s worth.
          </p>
        </section>

        <div className="pull">
          &ldquo;They&rsquo;re not betting you&rsquo;ll stay because they&rsquo;re the best.
          They&rsquo;re betting you won&rsquo;t bother to check.&rdquo;
        </div>

        <section>
          <h2>What this actually is</h2>
          <p>
            Upload a bill. We read it, work out what you&rsquo;re really paying, and compare it
            against every plan we can find. If there&rsquo;s a better deal, we show you — and
            write the script to call and ask for it, word for word.
          </p>
          <p>
            And the bit that makes us different from nearly everyone else:{" "}
            <strong>if you&rsquo;re already on a good deal, we&rsquo;ll tell you to stay put.</strong>{" "}
            No upsell, no drama. Sometimes the honest answer is &ldquo;you&rsquo;re fine, go enjoy
            your day,&rdquo; and we say it.
          </p>
        </section>

        <div className="data">
          <h3>Where the numbers come from</h3>
          <p>
            The Australian Energy Regulator publishes every electricity and gas plan in the
            country — it&rsquo;s public, free, and sitting there for anyone to read. The catch is
            that it&rsquo;s a sprawl of raw data that&rsquo;s almost impossible to make sense of
            by hand.
          </p>
          <p>
            So we do the dissecting for you. We take that public information, line it up against
            your actual usage, and turn it into a plain-English answer. Same data the comparison
            sites use — just pointed at your interests instead of theirs.
          </p>
        </div>

        <div className="promises">
          <h2>The deal we make with you</h2>

          {PROMISES.map((p) => (
            <div key={p.title} className="promise">
              <span className="promise-tick" aria-hidden="true">
                <Check className="promise-tick-icon" strokeWidth={3} />
              </span>
              <div className="promise-text">
                <strong>{p.title}</strong>
                <span>{p.body}</span>
              </div>
            </div>
          ))}
        </div>

        <section>
          <h2>Why bother building it?</h2>
          <p>
            Because the people hit hardest by the loyalty tax are usually the ones with the least
            time to fight it — and a few hundred dollars a year is real money quietly walking out
            the door of households that can least afford to lose it.
          </p>
          <p>
            The same tools big companies use to run rings around customers can be pointed the
            other way: to read the confusing bill, do the boring maths, and hand the advantage
            back to the person paying. That felt like a better use of the technology than another
            chatbot.
          </p>
        </section>
      </div>

      <div className="closing">
        <div className="wrap">
          <h2>Right then. Let&rsquo;s check yours.</h2>
          <p>Five minutes, free, no catch. Worst case, you find out you&rsquo;re already on a good deal.</p>
          <Link href="/" className="btn">
            Check my bill
            <ArrowRight className="btn-arrow" />
          </Link>
        </div>
      </div>

      <footer>
        <div className="wrap">
          <p>
            FairBills · Free, independent, on your side ·{" "}
            <Link href="/">Check a bill</Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

const PROMISES = [
  {
    title: "It’s free. Actually free.",
    body: "Not a trial. Not “free if you hand over your email forever.” Free.",
  },
  {
    title: "No commissions on your power or gas.",
    body: "Nobody pays us to recommend them — so we’ve no reason to recommend anyone but the cheapest. That’s the whole point.",
  },
  {
    title: "No accounts, no spam, no carry-on.",
    body: "You sign up for nothing. We don’t store your account number or your name. Upload, check, done.",
  },
  {
    title: "We’ll tell you to stay when you should.",
    body: "The most useful thing a comparison tool can say is “don’t switch, you’re fine.” We’re not too proud to say it.",
  },
];

const ABOUT_CSS = `
  .about-root {
    --green: #1d9e75;
    --green-dark: #04342c;
    --green-deep: #173404;
    --lime: #97c459;
    --lime-soft: #c0dd97;
    --paper: #f1efe8;
    --ink: #04342c;
    --ink-soft: #3d5a50;
    --about-border: rgba(4, 52, 44, 0.12);
    font-family: var(--font-spline), 'Spline Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--paper);
    color: var(--ink);
    line-height: 1.65;
    overflow-x: hidden;
    display: block;
    min-height: 100dvh;
  }
  .about-root *,
  .about-root *::before,
  .about-root *::after { box-sizing: border-box; }
  .about-root .wrap { max-width: 680px; margin: 0 auto; padding: 0 24px; }
  .about-root .topbar { padding: 22px 0; border-bottom: 0.5px solid var(--about-border); }
  .about-root .topbar-row { display: flex; align-items: center; justify-content: space-between; }
  .about-root .logo { display: flex; align-items: center; gap: 9px; text-decoration: none; color: var(--ink); }
  .about-root .logo-mark {
    width: 30px; height: 30px; background: var(--green); border-radius: 9px;
    display: grid; place-items: center; box-shadow: 0 2px 8px rgba(29, 158, 117, 0.3);
  }
  .about-root .logo-zap { width: 17px; height: 17px; color: #fff; }
  .about-root .logo-name { font-size: 17px; font-weight: 600; letter-spacing: -0.3px; }
  .about-root .nav-back { font-size: 14px; color: var(--ink-soft); text-decoration: none; font-weight: 500; }
  .about-root .nav-back:hover { color: var(--green); }
  .about-root .hero { padding: 76px 0 44px; position: relative; }
  .about-root .hero::before {
    content: ""; position: absolute; top: 36px; right: -120px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(151, 196, 89, 0.22), transparent 70%);
    border-radius: 50%; pointer-events: none; z-index: 0;
  }
  .about-root .kicker {
    font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--green); margin-bottom: 18px; position: relative; z-index: 1;
  }
  .about-root h1 {
    font-family: var(--font-fraunces), Georgia, serif;
    font-size: clamp(38px, 7vw, 58px); font-weight: 600; line-height: 1.03;
    letter-spacing: -1.5px; color: var(--green-dark); position: relative; z-index: 1;
    margin: 0;
  }
  .about-root h1 em { font-style: italic; color: var(--green); }
  .about-root .hero-sub {
    margin-top: 22px; font-size: 19px; color: var(--ink-soft);
    max-width: 520px; position: relative; z-index: 1;
  }
  .about-root section { padding: 26px 0; }
  .about-root h2 {
    font-family: var(--font-fraunces), Georgia, serif; font-size: 27px; font-weight: 600;
    letter-spacing: -0.6px; color: var(--green-dark); margin: 0 0 16px;
  }
  .about-root p { font-size: 17px; margin: 0 0 16px; }
  .about-root p:last-child { margin-bottom: 0; }
  .about-root .lead { font-size: 21px; line-height: 1.5; color: var(--green-dark); font-weight: 400; }
  .about-root strong { font-weight: 600; color: var(--green-dark); }
  .about-root .pull {
    margin: 40px 0; padding: 4px 0 4px 26px; border-left: 4px solid var(--lime);
    font-family: var(--font-fraunces), Georgia, serif; font-size: 25px; font-style: italic;
    line-height: 1.3; letter-spacing: -0.4px; color: var(--green-dark);
  }
  .about-root .promises {
    background: var(--green-deep); border-radius: 18px; padding: 36px 32px;
    margin: 44px 0; color: var(--paper);
  }
  .about-root .promises h2 { color: #fff; margin-bottom: 22px; }
  .about-root .promise {
    display: flex; gap: 15px; padding: 14px 0;
    border-top: 0.5px solid rgba(192, 221, 151, 0.2);
  }
  .about-root .promise:first-of-type { border-top: none; padding-top: 0; }
  .about-root .promise-tick {
    flex-shrink: 0; width: 25px; height: 25px; border-radius: 50%;
    background: var(--lime); display: grid; place-items: center; margin-top: 2px;
  }
  .about-root .promise-tick-icon { width: 13px; height: 13px; color: var(--green-dark); }
  .about-root .promise-text strong { color: #fff; display: block; font-size: 16px; margin-bottom: 2px; }
  .about-root .promise-text span { color: var(--lime-soft); font-size: 15px; line-height: 1.5; }
  .about-root .data {
    background: #fff; border: 0.5px solid var(--about-border); border-radius: 16px;
    padding: 28px 28px; margin: 40px 0;
  }
  .about-root .data h3 {
    font-family: var(--font-fraunces), Georgia, serif; font-size: 20px; font-weight: 600;
    color: var(--green-dark); margin: 0 0 12px;
  }
  .about-root .data p { font-size: 16px; }
  .about-root .closing { text-align: center; padding: 56px 0 84px; }
  .about-root .closing h2 { font-size: 32px; margin-bottom: 12px; }
  .about-root .closing p { font-size: 18px; color: var(--ink-soft); margin-bottom: 28px; }
  .about-root .btn {
    display: inline-flex; align-items: center; gap: 9px; background: var(--green);
    color: #fff; text-decoration: none; font-weight: 600; font-size: 17px;
    padding: 16px 30px; border-radius: 12px; box-shadow: 0 6px 20px rgba(29, 158, 117, 0.32);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .about-root .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(29, 158, 117, 0.4); }
  .about-root .btn-arrow { width: 18px; height: 18px; color: #fff; }
  .about-root footer { border-top: 0.5px solid var(--about-border); padding: 28px 0; text-align: center; }
  .about-root footer p { font-size: 13px; color: var(--ink-soft); }
  .about-root footer a { color: var(--green); text-decoration: none; }
  .about-root .fade { opacity: 0; transform: translateY(16px); animation: about-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .about-root .d1 { animation-delay: 0.05s; }
  .about-root .d2 { animation-delay: 0.13s; }
  .about-root .d3 { animation-delay: 0.21s; }
  @keyframes about-rise { to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .about-root .fade { animation: none; opacity: 1; transform: none; }
  }
`;
