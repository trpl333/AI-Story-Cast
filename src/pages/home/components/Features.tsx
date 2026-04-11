const features = [
  {
    icon: "ri-align-left",
    title: "Synced Scrolling Text",
    description:
      "The page turns itself. Text highlights and scrolls in perfect sync with narration — so your eyes and ears always agree.",
    color: "#C4873A",
    bg: "#FDF6EC",
    image: "https://readdy.ai/api/search-image?query=elegant%20dark%20mode%20ebook%20reader%20interface%20with%20highlighted%20text%20scrolling%20animation%2C%20warm%20amber%20accent%20colors%2C%20minimalist%20UI%20design%2C%20clean%20typography%2C%20soft%20glow%20on%20text%2C%20premium%20reading%20app%20mockup%2C%20dark%20background%20with%20cream%20text&width=600&height=400&seq=feat001&orientation=landscape",
  },
  {
    icon: "ri-user-voice-line",
    title: "Narrator + Character Voices",
    description:
      "Every character gets their own voice. Assign distinct AI voices to each role and let the story perform itself.",
    color: "#7A9E7E",
    bg: "#F0F5F0",
    image: "https://readdy.ai/api/search-image?query=voice%20selection%20UI%20with%20character%20chips%20and%20waveform%20visualizations%2C%20clean%20minimal%20interface%2C%20warm%20neutral%20tones%2C%20audio%20player%20controls%2C%20premium%20app%20design%2C%20soft%20rounded%20cards%2C%20light%20background&width=600&height=400&seq=feat002&orientation=landscape",
  },
  {
    icon: "ri-chat-3-line",
    title: "Pause to Discuss",
    description:
      "Hit pause and ask anything. Dig into themes, vocabulary, historical context — or just check if you understood the plot.",
    color: "#9B7EC8",
    bg: "#F5F0FA",
    image: "https://readdy.ai/api/search-image?query=AI%20chat%20interface%20overlaid%20on%20book%20text%2C%20question%20and%20answer%20bubbles%2C%20warm%20minimal%20design%2C%20soft%20purple%20and%20cream%20tones%2C%20premium%20reading%20assistant%20UI%2C%20clean%20typography%2C%20elegant%20layout&width=600&height=400&seq=feat003&orientation=landscape",
  },
  {
    icon: "ri-lightbulb-line",
    title: "AI Explanations in Plain English",
    description:
      "No more Googling archaic words. StoryCast explains difficult passages in clear, friendly language — right in context.",
    color: "#C4873A",
    bg: "#FDF6EC",
    image: "https://readdy.ai/api/search-image?query=tooltip%20explanation%20popup%20over%20book%20text%2C%20clean%20minimal%20UI%2C%20warm%20amber%20accent%2C%20definition%20card%20with%20soft%20shadow%2C%20premium%20reading%20app%20interface%2C%20elegant%20typography%2C%20light%20cream%20background&width=600&height=400&seq=feat004&orientation=landscape",
  },
  {
    icon: "ri-heart-line",
    title: "Personalized Voice Picks",
    description:
      "StoryCast learns what you like. The more you listen, the better it gets at recommending voices that match your taste.",
    color: "#C4607A",
    bg: "#FAF0F2",
    image: "https://readdy.ai/api/search-image?query=personalized%20recommendation%20UI%20with%20voice%20profile%20cards%2C%20warm%20rose%20and%20cream%20tones%2C%20minimal%20clean%20design%2C%20user%20preference%20settings%20interface%2C%20premium%20app%20mockup%2C%20soft%20rounded%20cards%2C%20elegant%20layout&width=600&height=400&seq=feat005&orientation=landscape",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 bg-[#FAF8F4]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="mb-14">
          <span
            className="inline-block bg-[#F5F0E8] text-[#5C5346] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 border border-[#E0D8CC]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Features
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-[#1C1A17] leading-tight max-w-xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Everything a great
            <br />
            <span className="italic">reading session needs.</span>
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.slice(0, 3).map((f, i) => (
            <FeatureCard key={i} feature={f} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          {features.slice(3).map((f, i) => (
            <FeatureCard key={i} feature={f} large />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, large = false }: { feature: typeof features[0]; large?: boolean }) {
  return (
    <div
      className={`group rounded-2xl border border-[#E8E0D4] overflow-hidden hover:border-[#C4B89A] transition-all duration-300 hover:-translate-y-1 ${large ? "flex flex-col md:flex-row" : "flex flex-col"}`}
    >
      {/* Image */}
      <div className={`overflow-hidden ${large ? "md:w-1/2 h-52 md:h-auto" : "h-44"}`} style={{ backgroundColor: feature.bg }}>
        <img
          src={feature.image}
          alt={feature.title}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Content */}
      <div className={`p-6 bg-white flex flex-col justify-center ${large ? "md:w-1/2" : ""}`}>
        <div
          className="w-9 h-9 flex items-center justify-center rounded-lg mb-4"
          style={{ backgroundColor: `${feature.color}18` }}
        >
          <i className={`${feature.icon} text-base`} style={{ color: feature.color }}></i>
        </div>
        <h3
          className="text-lg font-bold text-[#1C1A17] mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {feature.title}
        </h3>
        <p
          className="text-sm text-[#5C5346] leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {feature.description}
        </p>
      </div>
    </div>
  );
}
