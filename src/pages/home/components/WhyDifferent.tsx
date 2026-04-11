const points = [
  {
    icon: "ri-brain-line",
    title: "Not just text-to-speech",
    description:
      "TTS reads words. StoryCast performs stories. Every character has a voice, every scene has a mood — it's a full cast, not a robot.",
  },
  {
    icon: "ri-book-open-line",
    title: "Books become experiences",
    description:
      "We turn static text into interactive sessions. Pause, explore, question, and understand — the way great teachers always intended.",
  },
  {
    icon: "ri-lightbulb-flash-line",
    title: "Understand while you listen",
    description:
      "No more zoning out. Synced text keeps you anchored, and AI explanations mean you never lose the thread of a complex passage.",
  },
  {
    icon: "ri-heart-pulse-line",
    title: "Built for real readers",
    description:
      "Whether you're a student, a parent reading with kids, or a lifelong learner — StoryCast meets you where you are.",
  },
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
                src="https://readdy.ai/api/search-image?query=person%20reading%20on%20a%20cozy%20dark%20evening%2C%20warm%20lamp%20light%2C%20open%20book%20with%20glowing%20pages%2C%20intimate%20reading%20atmosphere%2C%20rich%20amber%20and%20dark%20tones%2C%20cinematic%20mood%2C%20artistic%20painterly%20style%2C%20no%20text%2C%20beautiful%20composition&width=800&height=900&seq=whydiff01&orientation=portrait"
                alt="Reading experience"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1C1A17]/60 lg:block hidden"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1A17]/80 to-transparent lg:hidden"></div>

              {/* Floating quote card */}
              <div className="absolute bottom-8 left-6 right-6 lg:right-auto lg:max-w-xs bg-[#2C2416]/90 backdrop-blur-sm rounded-2xl p-5 border border-[#3D3220]">
                <i className="ri-double-quotes-l text-3xl text-[#C4873A] block mb-2"></i>
                <p className="text-[#E8D9C0] text-sm leading-relaxed italic mb-3" style={{ fontFamily: "'Lora', serif" }}>
                  "It&apos;s the first time I actually finished a classic. StoryCast made it feel like a movie."
                </p>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src="https://readdy.ai/api/search-image?query=friendly%20young%20woman%20portrait%20warm%20tones%20minimal%20background&width=56&height=56&seq=testimonial01&orientation=squarish"
                      alt="User"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <p className="text-[#C4B89A] text-xs font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>Maya R.</p>
                    <p className="text-[#6B6355] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>Beta reader</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right content */}
            <div className="lg:w-[55%] px-8 md:px-12 py-12 md:py-16 flex flex-col justify-center">
              <span
                className="inline-block bg-[#2C2416] text-[#C4B89A] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-[#3D3220] w-fit"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Why StoryCast
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
                Audiobooks are passive. E-books are lonely. StoryCast is something new — a reading companion that listens, explains, and performs alongside you.
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
                <a
                  href="#demo"
                  className="px-6 py-3 bg-[#C4873A] text-white rounded-full text-sm font-semibold hover:bg-[#D4975A] transition-colors cursor-pointer whitespace-nowrap text-center"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Try the Demo
                </a>
                <a
                  href="#waitlist"
                  className="px-6 py-3 bg-transparent text-[#C4B89A] rounded-full text-sm font-semibold border border-[#3D3220] hover:border-[#6B6355] transition-colors cursor-pointer whitespace-nowrap text-center"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Join Waitlist
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
