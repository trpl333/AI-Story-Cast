const steps = [
  {
    number: "01",
    icon: "ri-book-open-line",
    title: "Open a curated classic",
    description:
      "We’re beginning with public-domain works we can ship responsibly. The first guided path stars Alice in Wonderland — more titles will follow as the experience stabilizes.",
  },
  {
    number: "02",
    icon: "ri-user-voice-line",
    title: "Set narrator + character voices",
    description:
      "Choose a narrator voice and distinct voices for key characters. The goal is a small-cast performance, not a monotone wall of text.",
  },
  {
    number: "03",
    icon: "ri-play-circle-line",
    title: "Listen, scroll, pause to discuss",
    description:
      "Follow synced scrolling text while you listen. When a line sticks with you, pause to dissect it, ask questions, or chase a tangent — still anchored to the passage on screen.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 gap-6">
          <div>
            <span
              className="inline-block bg-white text-[#5C5346] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 border border-[#E0D8CC]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              How it works
            </span>
            <h2
              className="text-4xl md:text-5xl font-bold text-[#1C1A17] leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Three steps to a
              <br />
              <span className="italic">livelier chapter.</span>
            </h2>
          </div>
          <p
            className="text-[#5C5346] text-base max-w-xs leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            This is still a demo-stage product: flows will move, voices will improve, and the catalog will grow — but the north star stays the same: reading that talks back.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-2xl p-8 border border-[#E8E0D4] hover:border-[#C4B89A] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#F5F0E8]">
                  <i className={`${step.icon} text-xl text-[#C4873A]`}></i>
                </div>
                <span
                  className="text-4xl font-bold text-[#E8E0D4] group-hover:text-[#D4C9B8] transition-colors"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {step.number}
                </span>
              </div>
              <h3
                className="text-xl font-bold text-[#1C1A17] mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {step.title}
              </h3>
              <p
                className="text-[#5C5346] text-sm leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            {
              title: "Featured first title",
              body: "Alice in Wonderland is the showcase spine while we prove out narration, sync, and discussion loops.",
            },
            {
              title: "Public-domain only (for now)",
              body: "We’re building on texts we can redistribute and experiment with openly — no shady scraping, no gray rights.",
            },
            {
              title: "Invites, not imaginary scale",
              body: "We’re not publishing vanity metrics. Early access is how we find readers who want to shape what ships next.",
            },
          ].map((item, i) => (
            <div key={i} className="text-left py-6 border-t border-[#E0D8CC] md:text-center md:px-2">
              <p
                className="text-lg font-bold text-[#1C1A17] mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {item.title}
              </p>
              <p
                className="text-sm text-[#8B7B6B] leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
