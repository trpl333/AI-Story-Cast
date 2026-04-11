import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../home/components/Navbar";
import Footer from "../home/components/Footer";

const voices = [
  { name: "Narrator", color: "#8B7355", icon: "ri-mic-2-line" },
  { name: "Alice", color: "#C4873A", icon: "ri-user-smile-line" },
  { name: "White Rabbit", color: "#7A9E7E", icon: "ri-ghost-smile-line" },
] as const;

/** Abridged, lightly modernized punctuation from the public-domain opening of Chapter I (Lewis Carroll). */
const passageParagraphs = [
  {
    label: "Narrator",
    text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it. "What is the use of a book," thought Alice, "without pictures or conversations?"',
  },
  {
    label: "Narrator",
    text: "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid) whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.",
  },
  {
    label: "Narrator",
    text: 'There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" But when the Rabbit actually took a watch out of its waistcoat-pocket and hurried on, Alice started to her feet and ran across the field after it, burning with curiosity.',
  },
];

export default function DemoReaderPage() {
  const [activeVoice, setActiveVoice] = useState<string>("Narrator");
  const [playing, setPlaying] = useState(false);
  const [discussDraft, setDiscussDraft] = useState("");
  const [discussThread, setDiscussThread] = useState<{ from: "you" | "note"; text: string }[]>([]);

  const sendDiscuss = () => {
    const t = discussDraft.trim();
    if (!t) return;
    setDiscussThread((prev) => [
      ...prev,
      { from: "you", text: t },
      {
        from: "note",
        text: "AI replies are not connected in this build — this is a layout preview. Synced discussion will plug in here later.",
      },
    ]);
    setDiscussDraft("");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <Navbar />
      <main className="pt-24 md:pt-28 pb-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto mb-8 text-center">
          <p
            className="inline-flex items-center gap-2 rounded-full border border-[#C4B89A]/80 bg-[#F5F0E8] px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-[#5C5346]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#C4873A]" aria-hidden />
            Early interactive demo preview
          </p>
          <p
            className="mt-4 text-sm leading-relaxed text-[#5C5346]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            You&apos;re on a front-end slice only: text is public domain, audio is a placeholder, and passage chat is
            not wired to a model yet. AI-assisted discussion and word-perfect synced scrolling are evolving features.
          </p>
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#3D3220] bg-[#1C1A17] shadow-2xl">
          <div className="flex flex-col gap-1 border-b border-[#3D3220]/60 px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                Public domain · demo reader
              </p>
              <h1
                className="mt-1 text-2xl font-bold text-[#E8D9C0] md:text-3xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Alice&apos;s Adventures in Wonderland
              </h1>
              <p className="mt-1 text-sm text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Lewis Carroll · Chapter I — Down the Rabbit-Hole
              </p>
            </div>
            <Link
              to="/"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#C4873A] hover:text-[#E8C99A] md:mt-0"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <i className="ri-arrow-left-line" aria-hidden />
              Back to home
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#3D3220]/60 px-6 py-4">
            <span className="w-full text-[#6B6355] text-xs uppercase tracking-widest md:w-auto md:mr-2 md:self-center" style={{ fontFamily: "'Inter', sans-serif" }}>
              Voice focus
            </span>
            {voices.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => setActiveVoice(v.name)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeVoice === v.name
                    ? "border-transparent text-white"
                    : "border-[#3D3220] text-[#8B7B6B] hover:border-[#6B6355]"
                }`}
                style={{
                  backgroundColor: activeVoice === v.name ? `${v.color}CC` : "transparent",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <i className={`${v.icon} text-xs`} aria-hidden />
                {v.name}
              </button>
            ))}
          </div>

          {/* Placeholder audio — swap `src` when you add e.g. public/assets/demo/chapter1.mp3 */}
          <div className="border-b border-[#3D3220]/60 px-6 py-5">
            <p className="mb-3 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
              Audio (placeholder)
            </p>
            <div className="rounded-2xl border border-dashed border-[#6B6355]/50 bg-[#2C2416]/60 px-4 py-4">
              <p className="mb-3 text-[#8B7B6B] text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                No narration file is bundled yet. Controls below are for layout only — drop an MP3 into{" "}
                <code className="text-[#C4B89A]">public/assets/demo/</code> and wire the{" "}
                <code className="text-[#C4B89A]">&lt;audio&gt;</code> element when ready.
              </p>
              <audio className="hidden" preload="none" />
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C4873A] text-white hover:bg-[#D4975A]"
                  aria-label={playing ? "Pause (inactive)" : "Play (inactive)"}
                >
                  <i className={`${playing ? "ri-pause-fill" : "ri-play-fill"} text-lg`} aria-hidden />
                </button>
                <div className="h-1.5 flex-1 rounded-full bg-[#3D3220]">
                  <div className="h-full w-[0%] rounded-full bg-[#C4873A]" />
                </div>
                <span className="text-[#6B6355] text-xs tabular-nums" style={{ fontFamily: "'Inter', sans-serif" }}>
                  0:00 / —
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
            <div className="border-b border-[#3D3220]/60 px-6 py-8 lg:border-b-0 lg:border-r">
              <p className="mb-4 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                Reading text
              </p>
              <div className="space-y-6 text-left">
                {passageParagraphs.map((block, i) => (
                  <div key={i}>
                    <p className="mb-2 text-[#6B6355] text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {block.label}
                    </p>
                    <p className="text-[#E8D9C0] text-sm leading-8 md:text-base md:leading-9" style={{ fontFamily: "'Lora', serif" }}>
                      {block.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col bg-[#1C1A17] px-6 py-8">
              <p className="mb-3 text-[#6B6355] text-xs uppercase tracking-widest" style={{ fontFamily: "'Inter', sans-serif" }}>
                Discuss this passage
              </p>
              <div className="min-h-[120px] flex-1 space-y-3 overflow-y-auto rounded-xl border border-[#3D3220] bg-[#2C2416]/50 p-3">
                {discussThread.length === 0 ? (
                  <p className="text-[#6B6355] text-xs italic" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Ask about a line, a word, or why Alice reacts the way she does — you&apos;ll see how the thread
                    could look once AI is connected.
                  </p>
                ) : (
                  discussThread.map((m, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        m.from === "you" ? "bg-[#3D3220]/60 text-[#C4B89A]" : "bg-[#C4873A]/15 text-[#E8D9C0]"
                      }`}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {m.text}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={discussDraft}
                  onChange={(e) => setDiscussDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), sendDiscuss())}
                  placeholder="e.g. What does Alice mean by pictures or conversations?"
                  className="min-w-0 flex-1 rounded-xl border border-[#3D3220] bg-[#2C2416] px-3 py-2.5 text-xs text-[#E8D9C0] outline-none placeholder:text-[#6B6355] focus:border-[#C4873A]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={sendDiscuss}
                  className="shrink-0 rounded-xl bg-[#C4873A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D4975A]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
