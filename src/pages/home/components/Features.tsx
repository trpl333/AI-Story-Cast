import { publicAsset } from "@/lib/publicAsset";

/** Marketing stills vendored under `/public/assets/home`; swap for real product shots when available. */
const features = [
  {
    icon: "ri-align-left",
    title: "Synced Scrolling Text",
    description:
      "Keep your place without juggling tabs. The text view scrolls with the narration so listening and reading stay in lockstep.",
    color: "#C4873A",
    bg: "#FDF6EC",
    image: publicAsset("assets/home/feat-01-synced-text.jpg"),
  },
  {
    icon: "ri-user-voice-line",
    title: "Narrator + Character Voices",
    description:
      "A storyteller voice carries exposition, while key characters get their own timbre — closer to radio drama than flat TTS.",
    color: "#7A9E7E",
    bg: "#F0F5F0",
    image: publicAsset("assets/home/feat-02-voices.jpg"),
  },
  {
    icon: "ri-chat-3-line",
    title: "Discuss or Dissect a Passage",
    description:
      "Pause on a line that puzzles you — themes, wordplay, historical winks — and talk it through without losing the page you’re on.",
    color: "#9B7EC8",
    bg: "#F5F0FA",
    image: publicAsset("assets/home/feat-03-discuss.jpg"),
  },
  {
    icon: "ri-lightbulb-line",
    title: "In-context nudges (on the roadmap)",
    description:
      "We’re experimenting with short, friendly glosses for dense Victorian phrasing — always optional, always tied to the sentence you’re hearing.",
    color: "#C4873A",
    bg: "#FDF6EC",
    image: publicAsset("assets/home/feat-04-context.jpg"),
  },
  {
    icon: "ri-book-2-line",
    title: "Curated public-domain shelf",
    description:
      "AIStoryCast starts with classics we can share openly. Alice leads the pack today; more curated titles arrive as the pipeline matures.",
    color: "#C4607A",
    bg: "#FAF0F2",
    image: publicAsset("assets/home/feat-05-curated.jpg"),
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
