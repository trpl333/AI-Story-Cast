import { useEffect, useRef } from "react";
import { publicAsset } from "@/lib/publicAsset";

export default function Hero() {
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      if (floatRef.current) {
        floatRef.current.style.transform = `translateY(${Math.sin(elapsed / 1800) * 10}px)`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#FAF8F4]">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={publicAsset("assets/home/hero-library.jpg")}
          alt="Warm library background"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4]/70 via-[#FAF8F4]/50 to-[#FAF8F4]"></div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute top-32 left-10 w-64 h-64 rounded-full bg-[#E8C99A]/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-40 right-10 w-80 h-80 rounded-full bg-[#C9B99A]/15 blur-3xl pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-28 pb-16 max-w-5xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#2C2416]/8 border border-[#2C2416]/15 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#C4873A] animate-pulse flex-shrink-0"></span>
          <span className="text-xs font-medium text-[#5C5346] tracking-wide uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>
            Early build · curated classics
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-5xl md:text-7xl font-bold text-[#1C1A17] leading-tight mb-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          The audiobook
          <br />
          <span className="italic text-[#C4873A]">that talks back.</span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg md:text-xl text-[#5C5346] max-w-2xl leading-relaxed mb-10"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          An interactive reading experience for public-domain books: listen with a narrator and character voices,
          follow along with synced scrolling text, and pause to discuss or dissect a passage. We&apos;re starting with
          curated classics — first up, <span className="text-[#1C1A17] font-medium">Alice in Wonderland</span> — while the product is still in demo shape.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <a
            href="#demo"
            className="px-8 py-3.5 bg-[#2C2416] text-[#FAF8F4] rounded-full font-semibold text-sm hover:bg-[#3D3220] transition-all duration-300 cursor-pointer whitespace-nowrap shadow-lg shadow-[#2C2416]/20"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Preview the Experience
          </a>
          <a
            href="#waitlist"
            className="px-8 py-3.5 bg-transparent text-[#1C1A17] rounded-full font-semibold text-sm border border-[#C4B89A] hover:bg-[#F0EBE3] transition-all duration-300 cursor-pointer whitespace-nowrap"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Get Early Access
          </a>
        </div>

        {/* Floating UI Mockup */}
        <div ref={floatRef} className="w-full max-w-4xl mx-auto">
          <div className="relative bg-[#1C1A17] rounded-2xl overflow-hidden shadow-2xl border border-[#3D3220]">
            {/* Mock top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#3D3220]/60">
              <div className="flex items-center gap-2">
                <img
                  src={publicAsset("assets/home/logo.png")}
                  alt="AIStoryCast"
                  className="h-5 w-5 object-contain"
                />
                <span className="text-[#C4B89A] text-xs font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>AIStoryCast</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#6B6355] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>Alice in Wonderland</span>
                <div className="w-2 h-2 rounded-full bg-[#C4873A]"></div>
              </div>
            </div>

            {/* Mock reading area */}
            <div className="flex">
              {/* Text panel */}
              <div className="flex-1 px-8 py-6 text-left">
                <p className="text-[#6B6355] text-xs uppercase tracking-widest mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>Chapter I — Down the Rabbit-Hole</p>
                <p className="text-[#C4B89A]/50 text-sm leading-7 mb-3" style={{ fontFamily: "'Lora', serif" }}>
                  Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do...
                </p>
                <p className="text-[#E8D9C0] text-sm leading-7 mb-3 bg-[#C4873A]/10 px-2 py-1 rounded-md border-l-2 border-[#C4873A]" style={{ fontFamily: "'Lora', serif" }}>
                  "What is the use of a book," thought Alice, "without pictures or conversations?"
                </p>
                <p className="text-[#C4B89A]/50 text-sm leading-7" style={{ fontFamily: "'Lora', serif" }}>
                  So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid)...
                </p>
              </div>

              {/* Side panel */}
              <div className="w-52 border-l border-[#3D3220]/60 px-4 py-6 hidden md:block">
                <p className="text-[#6B6355] text-xs uppercase tracking-widest mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>Cast</p>
                {[
                  { name: "Narrator", color: "#8B7355", icon: "ri-mic-line" },
                  { name: "Alice", color: "#C4873A", icon: "ri-user-smile-line" },
                  { name: "White Rabbit", color: "#7A9E7E", icon: "ri-ghost-smile-line" },
                ].map((v) => (
                  <div key={v.name} className="flex items-center gap-2.5 mb-3 cursor-pointer group">
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${v.color}22` }}
                    >
                      <i className={`${v.icon} text-xs`} style={{ color: v.color }}></i>
                    </div>
                    <span className="text-[#C4B89A] text-xs group-hover:text-[#E8D9C0] transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>{v.name}</span>
                  </div>
                ))}

                <div className="mt-6 pt-4 border-t border-[#3D3220]/60">
                  <p className="text-[#6B6355] text-xs uppercase tracking-widest mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>Ask AI</p>
                  <div className="bg-[#2C2416] rounded-lg px-3 py-2">
                    <p className="text-[#8B7355] text-xs italic" style={{ fontFamily: "'Inter', sans-serif" }}>What does Alice mean here?</p>
                  </div>
                  <div className="mt-2 bg-[#3D3220]/40 rounded-lg px-3 py-2">
                    <p className="text-[#C4B89A] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>Alice is expressing her love for engaging stories over dry text...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Playbar */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-[#3D3220]/60 bg-[#1C1A17]">
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#C4873A] cursor-pointer hover:bg-[#D4975A] transition-colors">
                <i className="ri-pause-fill text-sm text-white"></i>
              </button>
              <div className="flex-1 h-1 bg-[#3D3220] rounded-full overflow-hidden">
                <div className="h-full w-[38%] bg-[#C4873A] rounded-full"></div>
              </div>
              <span className="text-[#6B6355] text-xs whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif" }}>4:21 / 11:08</span>
              <button className="w-7 h-7 flex items-center justify-center cursor-pointer">
                <i className="ri-volume-up-line text-sm text-[#6B6355] hover:text-[#C4B89A] transition-colors"></i>
              </button>
            </div>
          </div>
        </div>

        <p
          className="mt-10 text-sm text-[#8B7B6B] max-w-md text-center"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          No inflated waitlist numbers here — we&apos;re an early-stage build. If this sounds fun, join for updates and
          a shot at early access when we open invites.
        </p>
      </div>
    </section>
  );
}
