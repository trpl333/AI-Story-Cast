import { useState } from "react";
import { publicAsset } from "@/lib/publicAsset";

const voices = [
  { name: "Narrator", icon: "ri-mic-2-line", color: "#8B7355", active: true },
  { name: "Alice", icon: "ri-user-smile-line", color: "#C4873A", active: false },
  { name: "White Rabbit", icon: "ri-ghost-smile-line", color: "#7A9E7E", active: false },
  { name: "Cheshire Cat", icon: "ri-ghost-line", color: "#9B7EC8", active: false },
  { name: "Queen of Hearts", icon: "ri-vip-crown-line", color: "#C4607A", active: false },
];

const passages = [
  {
    speaker: "Narrator",
    color: "#8B7355",
    text: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.",
  },
  {
    speaker: "Alice",
    color: "#C4873A",
    text: '"What is the use of a book," thought Alice, "without pictures or conversations?"',
    highlight: true,
  },
  {
    speaker: "Narrator",
    color: "#8B7355",
    text: "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies...",
  },
  {
    speaker: "White Rabbit",
    color: "#7A9E7E",
    text: '"Oh dear! Oh dear! I shall be too late!"',
  },
];

export default function DemoShowcase() {
  const [activeVoice, setActiveVoice] = useState("Narrator");
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(38);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    setProgress(Math.max(0, Math.min(100, pct)));
  };

  return (
    <section id="demo" className="py-24 md:py-32 bg-[#F5F0E8]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
          <div>
            <span
              className="inline-block bg-white text-[#5C5346] text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5 border border-[#E0D8CC]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Demo preview
            </span>
            <h2
              className="text-4xl md:text-5xl font-bold text-[#1C1A17] leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Featured first book:
              <br />
              <span className="italic">Alice in Wonderland</span>
            </h2>
          </div>
          <p
            className="text-[#5C5346] text-base max-w-md leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Below is a UI preview (not a live session yet): narrator + character lanes, synced scrolling copy, and a
            passage-tied chat lane for dissecting what you just heard — modeled on Chapter I of Carroll&apos;s public-domain text.
          </p>
        </div>

        {/* Main demo card */}
        <div className="bg-[#1C1A17] rounded-3xl overflow-hidden border border-[#3D3220]">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#3D3220]/60">
            <div className="flex items-center gap-3">
              <img
                src={publicAsset("assets/home/logo.png")}
                alt="AIStoryCast"
                className="h-6 w-6 object-contain"
              />
              <div>
                <p className="text-[#E8D9C0] text-sm font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Alice in Wonderland
                </p>
                <p className="text-[#6B6355] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Lewis Carroll · Chapter I
                </p>
              </div>
            </div>
            <span className="text-[#6B6355] text-xs font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
              UI mock · audio not wired on this page
            </span>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Reading panel */}
            <div className="flex-1 px-8 py-8">
              {/* Voice chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                {voices.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setActiveVoice(v.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap border ${
                      activeVoice === v.name
                        ? "border-transparent text-white"
                        : "border-[#3D3220] text-[#8B7B6B] hover:border-[#6B6355]"
                    }`}
                    style={{
                      backgroundColor: activeVoice === v.name ? `${v.color}CC` : "transparent",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <i className={`${v.icon} text-xs`}></i>
                    {v.name}
                  </button>
                ))}
              </div>

              {/* Text passages */}
              <div className="space-y-5">
                {passages.map((p, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-5 py-4 transition-all duration-300 ${
                      p.highlight
                        ? "bg-[#C4873A]/15 border border-[#C4873A]/30"
                        : "bg-[#2C2416]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{
                          color: voices.find((v) => v.name === p.speaker)?.color || "#8B7355",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {p.speaker}
                      </span>
                      {p.highlight && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4873A] animate-pulse"></span>
                          <span className="text-[#C4873A] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>Now playing</span>
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm leading-7 ${p.highlight ? "text-[#E8D9C0]" : "text-[#8B7B6B]"}`}
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {p.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel */}
            <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-[#3D3220]/60 flex flex-col">
              {/* Book cover */}
              <div className="p-5 border-b border-[#3D3220]/60">
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    {/* Placeholder art: swap for an authentic public-domain cover (e.g. Project Gutenberg art) when you pick one. */}
                    <img
                      src={publicAsset("assets/home/alice-cover.jpg")}
                      alt="Alice in Wonderland"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div>
                    <p className="text-[#E8D9C0] text-sm font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Alice in Wonderland
                    </p>
                    <p className="text-[#6B6355] text-xs mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>Lewis Carroll · public domain</p>
                    <p className="text-[#6B6355] text-xs leading-snug" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Flagship title while we tune voices, sync, and discussion UX.
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Chat */}
              <div className="flex-1 p-5">
                <p className="text-[#6B6355] text-xs uppercase tracking-widest mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Ask about this passage
                </p>
                <div className="space-y-3">
                  <div className="bg-[#2C2416] rounded-xl px-4 py-3">
                    <p className="text-[#8B7B6B] text-xs italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                      What does Alice mean by "pictures or conversations"?
                    </p>
                  </div>
                  <div className="bg-[#3D3220]/50 rounded-xl px-4 py-3">
                    <p className="text-[#C4B89A] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Alice is saying she finds books without illustrations or dialogue boring. Carroll is playfully setting up her imaginative, curious personality from the very first page.
                    </p>
                  </div>
                  <div className="bg-[#2C2416] rounded-xl px-4 py-3">
                    <p className="text-[#8B7B6B] text-xs italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Who is the White Rabbit?
                    </p>
                  </div>
                  <div className="bg-[#3D3220]/50 rounded-xl px-4 py-3">
                    <p className="text-[#C4B89A] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                      The White Rabbit is Alice&apos;s guide into Wonderland — always in a hurry, always late. He represents the pull of curiosity and the unknown.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 bg-[#2C2416] rounded-full px-4 py-2.5">
                  <input
                    type="text"
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-[#C4B89A] text-xs outline-none placeholder-[#6B6355]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  <button className="w-6 h-6 flex items-center justify-center rounded-full bg-[#C4873A] cursor-pointer hover:bg-[#D4975A] transition-colors">
                    <i className="ri-arrow-up-line text-xs text-white"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Playbar */}
          <div className="flex items-center gap-4 px-6 py-4 border-t border-[#3D3220]/60">
            <button
              onClick={() => setPlaying(!playing)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#C4873A] cursor-pointer hover:bg-[#D4975A] transition-colors flex-shrink-0"
            >
              <i className={`${playing ? "ri-pause-fill" : "ri-play-fill"} text-sm text-white`}></i>
            </button>
            <button className="w-7 h-7 flex items-center justify-center cursor-pointer flex-shrink-0">
              <i className="ri-skip-back-fill text-sm text-[#6B6355] hover:text-[#C4B89A] transition-colors"></i>
            </button>
            <div
              className="flex-1 h-1.5 bg-[#3D3220] rounded-full overflow-hidden cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-[#C4873A] rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-[#6B6355] text-xs whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif" }}>
              4:21 / 11:08
            </span>
            <button className="w-7 h-7 flex items-center justify-center cursor-pointer flex-shrink-0">
              <i className="ri-speed-line text-sm text-[#6B6355] hover:text-[#C4B89A] transition-colors"></i>
            </button>
            <button className="w-7 h-7 flex items-center justify-center cursor-pointer flex-shrink-0">
              <i className="ri-volume-up-line text-sm text-[#6B6355] hover:text-[#C4B89A] transition-colors"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
