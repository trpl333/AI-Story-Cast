import { Link } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";

const points = [
  {
    icon: "ri-brain-line",
    title: "Not just flat text-to-speech",
    description:
      "AIStoryCast is aiming for small-cast energy: a narrator plus distinct character voices so dialogue reads like dialogue, not a monotone skim.",
  },
  {
    icon: "ri-book-open-line",
    title: "Public-domain roots",
    description:
      "We’re grounding the experience in books everyone can access legally — starting with Alice — then widening the curated shelf as quality holds up.",
  },
  {
    icon: "ri-lightbulb-flash-line",
    title: "Stay oriented while you listen",
    description:
      "Synced scrolling text is the safety rail: you can look away, daydream, and snap back without hunting for the sentence that just played.",
  },
  {
    icon: "ri-heart-pulse-line",
    title: "For curious readers, not passive binges",
    description:
      "Students, bedtime storytellers, and stubborn classic finishers all share one habit — they talk back to the page. Now the page can answer.",
  },
];

const builtFor = [
  "Book clubs who wish the audiobook could pause for a tangent",
  "Teachers and learners dissecting language in the open",
  "Anyone who wants classics to feel theatrical, not homeworky",
];

export default function WhyDifferent() {
  return (
    <section id="why-different" className="py-24 md:py-32 bg-[#FAF8F4]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="bg-[#1C1A17] rounded-3xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left image */}
            <div className="lg:w-[45%] relative min-h-[400px] lg:min-h-0">
              <img
                src={publicAsset("assets/home/why-different.jpg")}
                alt="Cozy evening reading"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1C1A17]/60 lg:block hidden"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1A17]/80 to-transparent lg:hidden"></div>

              <div className="absolute bottom-8 left-6 right-6 lg:right-auto lg:max-w-xs bg-[#2C2416]/90 backdrop-blur-sm rounded-2xl p-5 border border-[#3D3220]">
                <p className="text-[#C4B89A] text-xs font-semibold uppercase tracking-widest mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
                  What AIStoryCast is built for
                </p>
                <ul className="space-y-2.5">
                  {builtFor.map((line) => (
                    <li key={line} className="flex gap-2 text-[#E8D9C0] text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <i className="ri-checkbox-circle-line text-[#C4873A] flex-shrink-0 mt-0.5"></i>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right content */}
            <div className="lg:w-[55%] px-8 md:px-12 py-12 md:py-16 flex flex-col justify-center">
              <span
                className="inline-block bg-[#2C2416] text-[#C4B89A] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-[#3D3220] w-fit"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Why AIStoryCast
              </span>
              <h2
                className="text-3xl md:text-4xl font-bold text-[#E8D9C0] leading-tight mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Reading reimagined.
                <br />
                <span className="italic text-[#C4873A]">Not just replayed.</span>
              </h2>
              <p
                className="text-[#8B7B6B] text-sm leading-relaxed mb-10"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Passive audiobooks skim past you. Lonely e-books leave you guessing. AIStoryCast sits in the middle — an
                early, opinionated demo where narration, synced text, and chat-shaped questions share one canvas built for
                public-domain classics.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {points.map((p, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#2C2416] border border-[#3D3220] flex-shrink-0 mt-0.5">
                      <i className={`${p.icon} text-sm text-[#C4873A]`}></i>
                    </div>
                    <div>
                      <h4
                        className="text-[#E8D9C0] text-sm font-semibold mb-1"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {p.title}
                      </h4>
                      <p
                        className="text-[#6B6355] text-xs leading-relaxed"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {p.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/demo"
                  className="px-6 py-3 bg-[#C4873A] text-white rounded-full text-sm font-semibold hover:bg-[#D4975A] transition-colors cursor-pointer whitespace-nowrap text-center"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Preview the Experience
                </Link>
                <Link
                  to="/#waitlist"
                  className="px-6 py-3 bg-transparent text-[#C4B89A] rounded-full text-sm font-semibold border border-[#3D3220] hover:border-[#6B6355] transition-colors cursor-pointer whitespace-nowrap text-center"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Get Early Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
