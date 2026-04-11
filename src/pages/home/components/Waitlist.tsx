import { useState } from "react";
import { publicAsset } from "@/lib/publicAsset";

export default function Waitlist() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    if (!name || !email) return;

    setLoading(true);
    try {
      const body = new URLSearchParams({ name, email });
      /**
       * Stays remote: Readdy-hosted form collector (not a static asset). Replace with your own API or form
       * provider when you decommission Readdy — a local file cannot substitute this URL.
       */
      await fetch("https://readdy.ai/api/form/d7d9ghfsch5bvrijfee0", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="waitlist" className="py-24 md:py-32 bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="relative rounded-3xl overflow-hidden">
          <img
            src={publicAsset("assets/home/waitlist-bg.jpg")}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1C1A17]/85 via-[#2C2416]/75 to-[#1C1A17]/80"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 px-10 md:px-16 py-16 md:py-20">
            {/* Left text */}
            <div className="lg:w-1/2">
              <span
                className="inline-block bg-[#C4873A]/20 text-[#E8C99A] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-[#C4873A]/30"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Early Access
              </span>
              <h2
                className="text-4xl md:text-5xl font-bold text-[#FAF8F4] leading-tight mb-5"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Be first to hear
                <br />
                <span className="italic text-[#C4873A]">the story unfold.</span>
              </h2>
              <p
                className="text-[#C4B89A] text-base leading-relaxed mb-6 max-w-md"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                AIStoryCast is still a demo-stage build. Join the list if you want occasional updates, invite-only previews,
                and a chance to steer what we ship next — no fabricated perks, just honest progress notes.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: "ri-gift-line", text: "Invite windows when we’re ready" },
                  { icon: "ri-shield-check-line", text: "No spam, ever" },
                  { icon: "ri-notification-line", text: "What we shipped lately" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className={`${item.icon} text-sm text-[#C4873A]`}></i>
                    </div>
                    <span className="text-[#C4B89A] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right form */}
            <div className="lg:w-[420px] w-full">
              {submitted ? (
                <div className="bg-[#2C2416]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#3D3220] text-center">
                  <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#C4873A]/20 mx-auto mb-4">
                    <i className="ri-check-line text-2xl text-[#C4873A]"></i>
                  </div>
                  <h3
                    className="text-[#E8D9C0] text-xl font-bold mb-2"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    You&apos;re on the list!
                  </h3>
                  <p
                    className="text-[#8B7B6B] text-sm leading-relaxed"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    We&apos;ll reach out when AIStoryCast has the next meaningful preview. Keep an eye on your inbox.
                  </p>
                </div>
              ) : (
                <form
                  data-readdy-form
                  onSubmit={handleSubmit}
                  className="bg-[#2C2416]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#3D3220]"
                >
                  <h3
                    className="text-[#E8D9C0] text-xl font-bold mb-1"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Get Early Access
                  </h3>
                  <p
                    className="text-[#6B6355] text-sm mb-6"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Small list today — help us grow it the right way.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-[#8B7B6B] text-xs font-medium mb-1.5 uppercase tracking-wide"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        Your Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="Jane Austen"
                        className="w-full bg-[#1C1A17] border border-[#3D3220] rounded-xl px-4 py-3 text-sm text-[#E8D9C0] placeholder-[#4A4235] outline-none focus:border-[#C4873A] transition-colors"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[#8B7B6B] text-xs font-medium mb-1.5 uppercase tracking-wide"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="jane@example.com"
                        className="w-full bg-[#1C1A17] border border-[#3D3220] rounded-xl px-4 py-3 text-sm text-[#E8D9C0] placeholder-[#4A4235] outline-none focus:border-[#C4873A] transition-colors"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#C4873A] text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-[#D4975A] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {loading ? "Joining..." : "Get Early Access"}
                    </button>
                  </div>

                  <p
                    className="text-[#4A4235] text-xs text-center mt-4"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    No spam. Unsubscribe anytime.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
