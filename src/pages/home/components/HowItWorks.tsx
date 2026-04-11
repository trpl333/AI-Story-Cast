const steps = [
  {
    number: "01",
    icon: "ri-search-line",
    title: "Search for a book",
    description:
      "Browse thousands of public-domain classics — from Austen to Twain. Find your next great read in seconds.",
  },
  {
    number: "02",
    icon: "ri-user-voice-line",
    title: "Choose your cast",
    description:
      "Pick a narrator voice and assign distinct AI voices to each character. Make the story feel alive.",
  },
  {
    number: "03",
    icon: "ri-play-circle-line",
    title: "Play and follow along",
    description:
      "Text scrolls in sync with narration. Pause anytime to ask questions, get explanations, or just think.",
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
              <span className="italic">richer reading life.</span>
            </h2>
          </div>
          <p
            className="text-[#5C5346] text-base max-w-xs leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            No setup. No subscriptions. Just pick a book and start listening — with your brain fully engaged.
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

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          {[
            { value: "50,000+", label: "Public-domain books" },
            { value: "12+", label: "Narrator voices" },
            { value: "< 30s", label: "To start listening" },
            { value: "100%", label: "Free to explore" },
          ].map((stat, i) => (
            <div key={i} className="text-center py-6 border-t border-[#E0D8CC]">
              <p
                className="text-3xl md:text-4xl font-bold text-[#1C1A17] mb-1"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {stat.value}
              </p>
              <p
                className="text-sm text-[#8B7B6B]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
