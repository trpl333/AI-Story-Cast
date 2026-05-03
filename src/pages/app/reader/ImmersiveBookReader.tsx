import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ReaderParagraph } from "@/data/curatedChapters";
import { requestSceneImage, revokeSceneObjectUrl } from "@/lib/aistorycastSceneImage";
import { chunkParagraphsIntoPages, paragraphsToPlainText } from "./bookPagination";
import { ReaderChapterNav } from "./ReaderChapterNav";

const paperTextureBg = [
  "linear-gradient(to bottom, rgba(255,255,255,0.14) 0%, transparent 42%)",
  "repeating-linear-gradient(0deg, transparent 0px, transparent 22px, rgba(90,72,52,0.045) 22px, rgba(90,72,52,0.045) 23px)",
  "repeating-linear-gradient(90deg, transparent 0px, transparent 31px, rgba(70,55,40,0.03) 31px, rgba(70,55,40,0.03) 32px)",
  "linear-gradient(145deg, #faf4e8 0%, #efe4d4 38%, #e8dcc4 100%)",
].join(", ");

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

/** Renders imported/seed paragraphs only. Enhanced narration text is not wired in the reader yet. */
function PageFace(props: { paragraphs: ReaderParagraph[]; side: "left" | "right"; empty?: boolean }) {
  const { paragraphs, side, empty } = props;
  const curlRadius = side === "left" ? "2px 3px 6px 2px" : "3px 2px 2px 6px";

  return (
    <div
      className={[
        "relative flex min-h-[min(50vh,400px)] flex-1 flex-col overflow-hidden sm:min-h-[min(56vh,500px)] lg:min-h-[min(58vh,540px)]",
        empty ? "items-center justify-center opacity-55" : "",
      ].join(" ")}
      style={{
        borderRadius: curlRadius,
        backgroundImage: empty ? "linear-gradient(145deg, #e8dcc4 0%, #ddd0bc 100%)" : paperTextureBg,
        backgroundColor: "#efe4d4",
        boxShadow:
          side === "left"
            ? "inset 5px 0 18px rgba(45,35,22,0.1), inset 0 -4px 12px rgba(255,255,255,0.45), 6px 10px 28px rgba(0,0,0,0.28), -1px 0 0 rgba(62,48,28,0.08)"
            : "inset -5px 0 18px rgba(45,35,22,0.1), inset 0 -4px 12px rgba(255,255,255,0.45), -6px 10px 28px rgba(0,0,0,0.28), 1px 0 0 rgba(62,48,28,0.08)",
        border: "1px solid rgba(62,48,28,0.12)",
      }}
    >
      {!empty && (
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              side === "left"
                ? "linear-gradient(90deg, rgba(255,255,255,0.35) 0%, transparent 18%, transparent 100%)"
                : "linear-gradient(270deg, rgba(255,255,255,0.35) 0%, transparent 18%, transparent 100%)",
          }}
        />
      )}
      {empty ? (
        <p className="text-center font-serif text-sm italic text-[#6b5c48]">—</p>
      ) : (
        <div className="relative z-[1] flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
          {paragraphs.map((p, idx) => (
            <div key={idx}>
              <p
                className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#6e5c42]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {p.label}
              </p>
              <p
                className="mt-1.5 text-[0.95rem] leading-[1.72] text-[#241c14] sm:text-[1.03rem]"
                style={{
                  fontFamily: "'Lora', 'Georgia', serif",
                  textShadow: "0 0.5px 0 rgba(255,255,255,0.35)",
                }}
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
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [sceneFilename, setSceneFilename] = useState<string | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [sceneLoading, setSceneLoading] = useState(false);
  const sceneBlobUrlRef = useRef<string | null>(null);

  const lastSpreadStart = pages.length <= 1 ? 0 : Math.floor((pages.length - 1) / 2) * 2;
  const effectiveMaxLeft = wide ? lastSpreadStart : Math.max(0, pages.length - 1);

  const replaceSceneUrl = useCallback((next: string | null) => {
    if (sceneBlobUrlRef.current && sceneBlobUrlRef.current !== next) {
      revokeSceneObjectUrl(sceneBlobUrlRef.current);
      sceneBlobUrlRef.current = null;
    }
    if (next?.startsWith("blob:")) {
      sceneBlobUrlRef.current = next;
    }
    setSceneUrl(next);
  }, []);

  useEffect(() => {
    setFlatLeftIndex(0);
    replaceSceneUrl(null);
    setSceneFilename(null);
    setSceneError(null);
  }, [bookId, chapterSlug, replaceSceneUrl]);

  useEffect(() => {
    setFlatLeftIndex((i) => Math.min(i, effectiveMaxLeft));
  }, [effectiveMaxLeft]);

  useEffect(() => {
    return () => {
      revokeSceneObjectUrl(sceneBlobUrlRef.current);
      sceneBlobUrlRef.current = null;
    };
  }, []);

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
      replaceSceneUrl(result.url);
      setSceneFilename(result.filename ?? null);
    } else {
      replaceSceneUrl(null);
      setSceneFilename(null);
      setSceneError(result.error);
    }
  }, [spreadPlainText, replaceSceneUrl]);

  const spreadLabel =
    wide && rightPage && rightPage.length > 0
      ? `Spread ${Math.floor(clampedLeft / 2) + 1} · pages ${clampedLeft + 1}–${clampedLeft + 2}`
      : `Page ${clampedLeft + 1} of ${pages.length}`;

  const pageTurnY = wide ? "6deg" : "3deg";

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

      <div className="relative z-[1] mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:max-w-[92rem] lg:px-10">
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
            <header className="mb-6 text-center">
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

            {/* Pedestal + open book (3D + leather) */}
            <div className="relative mx-auto max-w-[58rem] px-1 sm:px-2">
              <div
                className="absolute -bottom-2 left-1/2 h-28 w-[min(94%,560px)] -translate-x-1/2 rounded-[50%] blur-lg"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(201,162,39,0.28) 0%, transparent 72%)",
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 h-12 w-[min(90%,500px)] -translate-x-1/2 rounded-sm"
                style={{
                  background: "linear-gradient(to bottom, #453220, #120d0a)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.72)",
                }}
              />

              <div
                className="relative mx-auto pb-10 pt-2"
                style={{ perspective: "2400px", perspectiveOrigin: "50% 35%" }}
              >
                {/* Leather case (visible behind / under pages) */}
                <div
                  className="absolute left-1/2 top-6 z-0 w-[calc(100%-4px)] max-w-[52rem] -translate-x-1/2 rounded-[14px] sm:top-8"
                  style={{
                    height: "calc(100% - 0.5rem)",
                    minHeight: "min(62vh, 560px)",
                    background:
                      "linear-gradient(168deg, #5c3d28 0%, #2a1a12 22%, #1f1410 55%, #3d2818 88%, #4a3220 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.08), inset 0 -12px 24px rgba(0,0,0,0.55), 0 28px 56px rgba(0,0,0,0.65)",
                    transform: "translateZ(-14px) scale(1.03)",
                    transformStyle: "preserve-3d",
                  }}
                />

                <div
                  className="relative z-[1] mx-auto max-w-[52rem] rounded-xl p-3 sm:p-4"
                  style={{
                    background: "linear-gradient(150deg, rgba(36,24,16,0.95) 0%, rgba(18,12,8,0.98) 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(201,162,39,0.15), 0 32px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="rounded-lg p-2 sm:p-2.5"
                    style={{
                      background:
                        "linear-gradient(165deg, #3d2818 0%, #241810 40%, #2e1e14 70%, #423018 100%), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
                      boxShadow: "inset 0 3px 12px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      className="flex flex-col items-stretch justify-center gap-0 sm:flex-row"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div
                        className="min-w-0 flex-1 sm:max-w-[min(50%,24rem)] lg:max-w-[min(50%,26rem)]"
                        style={{
                          transform: `rotateY(${pageTurnY})`,
                          transformOrigin: "right center",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <PageFace paragraphs={leftPage} side="left" />
                      </div>

                      {/* Gutter / spine shadow between pages */}
                      <div
                        className="hidden w-[10px] shrink-0 sm:block lg:w-[14px]"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(40,28,18,0.95) 35%, rgba(20,14,10,1) 50%, rgba(40,28,18,0.95) 65%, rgba(0,0,0,0.55) 100%)",
                          boxShadow:
                            "inset 0 0 20px rgba(0,0,0,0.9), inset 4px 0 8px rgba(0,0,0,0.35), inset -4px 0 8px rgba(0,0,0,0.35)",
                        }}
                      />

                      {wide ? (
                        <div
                          className="min-w-0 flex-1 sm:max-w-[min(50%,24rem)] lg:max-w-[min(50%,26rem)]"
                          style={{
                            transform: `rotateY(-${pageTurnY})`,
                            transformOrigin: "left center",
                            transformStyle: "preserve-3d",
                          }}
                        >
                          <PageFace
                            paragraphs={rightPage ?? []}
                            side="right"
                            empty={!rightPage || rightPage.length === 0}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
            <div className="mx-auto mt-0 max-w-5xl space-y-4 lg:mt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#5c4a2a]/60 bg-[#1f1610]/80 p-1">
                  <button
                    type="button"
                    aria-current="true"
                    className="rounded-full bg-[#c9a227] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#1a1308]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Exact text
                  </button>
                  <button
                    type="button"
                    disabled={true}
                    aria-disabled="true"
                    title="Enhanced narration text coming next."
                    className="pointer-events-none cursor-not-allowed rounded-full border border-transparent bg-[#1a120c]/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#5c4f44] opacity-55"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Enhanced (coming next)
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
