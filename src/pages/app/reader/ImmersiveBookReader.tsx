import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ReaderParagraph } from "@/data/curatedChapters";
import { requestSceneImage } from "@/lib/aistorycastSceneImage";
import { chunkParagraphsIntoPages, paragraphsToPlainText } from "./bookPagination";
import { ReaderChapterNav } from "./ReaderChapterNav";

type TextMode = "exact" | "enhanced";

function useReaderLayout() {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 900px)").matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const fn = () => setWide(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const maxCharsPerPage = wide ? 1050 : 560;
  return { wide, maxCharsPerPage };
}

function PageFace(props: {
  paragraphs: ReaderParagraph[];
  textMode: TextMode;
  side: "left" | "right";
  empty?: boolean;
}) {
  const { paragraphs, textMode, side, empty } = props;

  return (
    <div
      className={[
        "relative flex min-h-[min(52vh,420px)] flex-1 flex-col overflow-hidden rounded-sm border shadow-inner sm:min-h-[min(58vh,520px)]",
        side === "left"
          ? "border-[#4a3c28]/40 bg-gradient-to-br from-[#f7eedc] via-[#efe4cf] to-[#e8d9c0]"
          : "border-[#4a3c28]/40 bg-gradient-to-bl from-[#f7eedc] via-[#efe4cf] to-[#e8d9c0]",
        empty ? "items-center justify-center opacity-60" : "",
      ].join(" ")}
      style={{
        boxShadow:
          side === "left"
            ? "inset 6px 0 24px rgba(62,48,28,0.12), inset 0 -3px 0 rgba(255,255,255,0.35)"
            : "inset -6px 0 24px rgba(62,48,28,0.12), inset 0 -3px 0 rgba(255,255,255,0.35)",
      }}
    >
      {empty ? (
        <p className="text-center font-serif text-sm italic text-[#6b5c48]">—</p>
      ) : textMode === "enhanced" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <p className="text-sm font-medium text-[#5c4a38]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Enhanced text
          </p>
          <p className="max-w-sm text-[0.95rem] leading-relaxed italic text-[#6b5c48]" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Enhanced text generation coming next. Switch to Exact text to read this page.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {paragraphs.map((p, idx) => (
            <div key={idx}>
              <p
                className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#7a6548]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {p.label}
              </p>
              <p
                className="mt-1.5 text-[0.95rem] leading-[1.65] text-[#2a2118] sm:text-[1.02rem]"
                style={{ fontFamily: "'Lora', 'Georgia', serif" }}
              >
                <span className="whitespace-pre-wrap">{p.text}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type ImmersiveBookReaderProps = {
  bookId: string;
  chapterSlug: string;
  bookTitle: string;
  author: string;
  chapterHeading: string;
  paragraphs: ReaderParagraph[];
  prevChapterSlug: string | null;
  nextChapterSlug: string | null;
};

export function ImmersiveBookReader(props: ImmersiveBookReaderProps) {
  const { bookId, chapterSlug, bookTitle, author, chapterHeading, paragraphs, prevChapterSlug, nextChapterSlug } =
    props;

  const { wide, maxCharsPerPage } = useReaderLayout();
  const pages = useMemo(() => chunkParagraphsIntoPages(paragraphs, maxCharsPerPage), [paragraphs, maxCharsPerPage]);

  const [flatLeftIndex, setFlatLeftIndex] = useState(0);
  const [textMode, setTextMode] = useState<TextMode>("exact");
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [sceneFilename, setSceneFilename] = useState<string | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState(false);

  const lastSpreadStart = pages.length <= 1 ? 0 : Math.floor((pages.length - 1) / 2) * 2;
  const effectiveMaxLeft = wide ? lastSpreadStart : Math.max(0, pages.length - 1);

  useEffect(() => {
    setFlatLeftIndex(0);
    setSceneUrl(null);
    setSceneFilename(null);
    setSceneError(null);
  }, [bookId, chapterSlug]);

  useEffect(() => {
    setFlatLeftIndex((i) => Math.min(i, effectiveMaxLeft));
  }, [effectiveMaxLeft]);

  const clampedLeft = Math.min(flatLeftIndex, Math.max(0, effectiveMaxLeft));
  const leftPage = pages[clampedLeft] ?? [];
  const rightPage = wide ? pages[clampedLeft + 1] ?? null : null;

  const canPrevPage = clampedLeft > 0;
  const canNextPage = wide ? clampedLeft + 2 < pages.length : clampedLeft < pages.length - 1;

  const goPrevPage = useCallback(() => {
    setFlatLeftIndex((i) => {
      const cur = Math.min(i, effectiveMaxLeft);
      if (wide) return Math.max(0, cur - 2);
      return Math.max(0, cur - 1);
    });
  }, [wide, effectiveMaxLeft]);

  const goNextPage = useCallback(() => {
    setFlatLeftIndex((i) => {
      const cur = Math.min(i, effectiveMaxLeft);
      if (wide) return Math.min(lastSpreadStart, cur + 2);
      return Math.min(pages.length - 1, cur + 1);
    });
  }, [wide, effectiveMaxLeft, lastSpreadStart, pages.length]);

  const spreadPlainText = useMemo(() => {
    const parts = [paragraphsToPlainText(leftPage)];
    if (rightPage && rightPage.length > 0) parts.push(paragraphsToPlainText(rightPage));
    return parts.join("\n\n");
  }, [leftPage, rightPage]);

  const onShowScene = useCallback(async () => {
    setSceneLoading(true);
    setSceneError(null);
    const result = await requestSceneImage(spreadPlainText);
    setSceneLoading(false);
    if (result.ok) {
      setSceneUrl(result.url);
      setSceneFilename(result.filename ?? null);
    } else {
      setSceneUrl(null);
      setSceneFilename(null);
      setSceneError(result.error);
    }
  }, [spreadPlainText]);

  const spreadLabel =
    wide && rightPage && rightPage.length > 0
      ? `Spread ${Math.floor(clampedLeft / 2) + 1} · pages ${clampedLeft + 1}–${clampedLeft + 2}`
      : `Page ${clampedLeft + 1} of ${pages.length}`;

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden text-[#f0e6d4]"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(201,162,39,0.18) 0%, transparent 55%), radial-gradient(ellipse 90% 60% at 50% 100%, rgba(0,0,0,0.45) 0%, transparent 50%), linear-gradient(165deg, #1a120c 0%, #2d1f14 35%, #1f1510 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          )`,
        }}
      />

      <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:max-w-[88rem] lg:px-8">
        <nav
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#b9a88a]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <Link to="/app" className="transition-colors hover:text-[#f0e6d4]">
            Home
          </Link>
          <span className="text-[#6b5c48]" aria-hidden>
            /
          </span>
          <Link to="/app/library" className="transition-colors hover:text-[#f0e6d4]">
            Library
          </Link>
          <span className="text-[#6b5c48]" aria-hidden>
            /
          </span>
          <span className="font-medium text-[#e8dcc8]">{bookTitle}</span>
          <span className="text-[#6b5c48]" aria-hidden>
            /
          </span>
          <span className="font-medium text-[#f5edd8]">{chapterHeading}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:items-start lg:gap-10">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <header className="mb-5 text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Now reading
              </p>
              <h1
                className="mx-auto mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#fdf6e9] drop-shadow sm:text-3xl"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 2px 0 rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.45)",
                }}
              >
                {chapterHeading}
              </h1>
              {author ? (
                <p className="mt-2 text-sm text-[#c4b49a]" style={{ fontFamily: "'Lora', serif" }}>
                  {author}
                </p>
              ) : null}
            </header>

            {/* Pedestal + open book */}
            <div className="relative mx-auto max-w-5xl">
              <div
                className="absolute -bottom-4 left-1/2 h-24 w-[min(92%,520px)] -translate-x-1/2 rounded-[50%] blur-md"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(201,162,39,0.25) 0%, transparent 70%)",
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 h-10 w-[min(88%,480px)] -translate-x-1/2 rounded-sm opacity-90"
                style={{
                  background: "linear-gradient(to bottom, #3d2a18, #1a120c)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.65)",
                }}
              />

              <div
                className="relative rounded-lg p-3 sm:p-5"
                style={{
                  background: "linear-gradient(145deg, #2a1d14 0%, #1f1610 40%, #261a12 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(201,162,39,0.12), 0 24px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {/* Leather frame */}
                <div
                  className="rounded-md p-2 sm:p-3"
                  style={{
                    background: "linear-gradient(160deg, #4a3020 0%, #2c1c12 50%, #3d2818 100%)",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch">
                    <PageFace paragraphs={leftPage} textMode={textMode} side="left" />
                    {/* Spine */}
                    <div
                      className="hidden w-3 shrink-0 sm:block"
                      style={{
                        background: "linear-gradient(90deg, #1a120c, #3d2e22 45%, #1a120c)",
                        boxShadow: "inset 0 0 12px rgba(0,0,0,0.9)",
                      }}
                    />
                    {wide ? (
                      <PageFace
                        paragraphs={rightPage ?? []}
                        textMode={textMode}
                        side="right"
                        empty={!rightPage || rightPage.length === 0}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scene panel: below book on mobile, right column on large screens */}
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start">
            <div
              className="rounded-lg border border-[#5c4a2a]/50 p-4 lg:sticky lg:top-6"
              style={{
                background: "linear-gradient(180deg, rgba(42,31,20,0.95) 0%, rgba(26,18,12,0.98) 100%)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
              }}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Scene
              </p>
              {sceneUrl ? (
                <div className="mt-3">
                  <img src={sceneUrl} alt="Illustration for this spread" className="w-full rounded-md border border-[#4a3c28]/40 shadow-lg" />
                  {sceneFilename ? (
                    <p className="mt-2 text-xs text-[#8a7a66]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {sceneFilename}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-[#a0907a]" style={{ fontFamily: "'Lora', serif" }}>
                  Use <span className="font-semibold text-[#e8dcc8]">Show this scene</span> to illustrate the open pages via the AIStoryCast image workflow.
                </p>
              )}
            </div>
          </aside>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {/* Controls */}
            <div className="mx-auto mt-0 max-w-5xl space-y-4 lg:mt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#5c4a2a]/60 bg-[#1f1610]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setTextMode("exact")}
                    className={[
                      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                      textMode === "exact" ? "bg-[#c9a227] text-[#1a1308]" : "text-[#c4b49a] hover:text-[#f0e6d4]",
                    ].join(" ")}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Exact text
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextMode("enhanced")}
                    className={[
                      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                      textMode === "enhanced" ? "bg-[#c9a227] text-[#1a1308]" : "text-[#c4b49a] hover:text-[#f0e6d4]",
                    ].join(" ")}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Enhanced text
                  </button>
                </div>

                <p className="text-center text-xs text-[#8a7a66] sm:text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {spreadLabel}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goPrevPage}
                    disabled={!canPrevPage}
                    className="rounded-full border border-[#5c4a2a]/80 bg-[#2a1f14] px-4 py-2.5 text-sm font-medium text-[#f0e6d4] transition-colors hover:border-[#c9a227]/50 disabled:cursor-not-allowed disabled:opacity-35"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Previous page
                  </button>
                  <button
                    type="button"
                    onClick={goNextPage}
                    disabled={!canNextPage}
                    className="rounded-full border border-[#5c4a2a]/80 bg-[#2a1f14] px-4 py-2.5 text-sm font-medium text-[#f0e6d4] transition-colors hover:border-[#c9a227]/50 disabled:cursor-not-allowed disabled:opacity-35"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Next page
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onShowScene}
                    disabled={sceneLoading || spreadPlainText.trim().length === 0}
                    className="rounded-full border border-[#8b6914]/70 bg-gradient-to-b from-[#6b4e1c] to-[#3d2a12] px-4 py-2.5 text-sm font-semibold text-[#fdf6e9] shadow transition-colors hover:from-[#7a5a22] hover:to-[#4a3418] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {sceneLoading ? "Generating…" : "Show this scene"}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-[#5c4a2a]/50 bg-[#1a120c]/80 px-4 py-2.5 text-sm text-[#7a6a58]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    title="Narration coming next"
                  >
                    Narration coming next
                  </button>
                </div>
              </div>

              {sceneError ? (
                <p className="text-center text-sm text-amber-200/90 sm:text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {sceneError}
                </p>
              ) : null}

              <div className="flex justify-center border-t border-[#4a3c28]/50 pt-6 sm:pt-8">
                <ReaderChapterNav
                  bookId={bookId}
                  prevSlug={prevChapterSlug}
                  nextSlug={nextChapterSlug}
                  layout="footer"
                  variant="library"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
