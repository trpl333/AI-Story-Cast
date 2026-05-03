import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { ReaderParagraph } from "@/data/curatedChapters";
import { requestSceneImage, revokeSceneObjectUrl } from "@/lib/aistorycastSceneImage";
import { chunkParagraphsIntoPages, paragraphsToPlainText } from "./bookPagination";
import { ReaderChapterNav } from "./ReaderChapterNav";

const paperFaceBg = [
  "radial-gradient(ellipse 120% 40% at 50% 0%, rgba(255,255,255,0.22) 0%, transparent 55%)",
  "repeating-linear-gradient(0deg, transparent 0px, transparent 21px, rgba(88,70,48,0.038) 21px, rgba(88,70,48,0.038) 22px)",
  "repeating-linear-gradient(90deg, transparent 0px, transparent 28px, rgba(72,56,40,0.028) 28px, rgba(72,56,40,0.028) 29px)",
  "linear-gradient(158deg, #fdf8ee 0%, #f2e8d4 42%, #e9dcc6 100%)",
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
  const towardGutter = side === "left" ? "right" : "left";
  const roundMain = side === "left" ? "rounded-l-[10px] rounded-r-[3px]" : "rounded-r-[10px] rounded-l-[3px]";

  const foreEdgeShadow =
    side === "left"
      ? "2px 0 0 rgba(250,244,232,0.55), 5px 0 0 rgba(210,190,160,0.35), 8px 0 0 rgba(180,155,125,0.2), 11px 0 0 rgba(0,0,0,0.06)"
      : "-2px 0 0 rgba(250,244,232,0.55), -5px 0 0 rgba(210,190,160,0.35), -8px 0 0 rgba(180,155,125,0.2), -11px 0 0 rgba(0,0,0,0.06)";

  const faceShadow =
    side === "left"
      ? `inset 4px 0 14px rgba(55,42,28,0.08), inset 0 -6px 14px rgba(255,255,255,0.38), 0 14px 28px rgba(0,0,0,0.22), ${foreEdgeShadow}`
      : `inset -4px 0 14px rgba(55,42,28,0.08), inset 0 -6px 14px rgba(255,255,255,0.38), 0 14px 28px rgba(0,0,0,0.22), ${foreEdgeShadow}`;

  return (
    <div className={`relative min-h-0 flex-1 ${roundMain}`}>
      {/* Simulated page block thickness at fore-edge (toward gutter) */}
      {!empty && (
        <div
          className={`pointer-events-none absolute inset-y-3 z-0 ${towardGutter === "right" ? "right-0" : "left-0"} w-[5px] sm:w-[7px]`}
          style={{
            background:
              towardGutter === "right"
                ? "linear-gradient(90deg, rgba(0,0,0,0.12) 0%, rgba(245,236,218,0.5) 40%, rgba(255,255,255,0.15) 100%)"
                : "linear-gradient(270deg, rgba(0,0,0,0.12) 0%, rgba(245,236,218,0.5) 40%, rgba(255,255,255,0.15) 100%)",
            boxShadow: towardGutter === "right" ? "inset 2px 0 4px rgba(0,0,0,0.15)" : "inset -2px 0 4px rgba(0,0,0,0.15)",
          }}
        />
      )}

      <div
        className={[
          "relative z-[1] flex min-h-[min(50vh,400px)] flex-1 flex-col overflow-hidden sm:min-h-[min(56vh,500px)] lg:min-h-[min(58vh,540px)]",
          roundMain,
          empty ? "items-center justify-center opacity-55" : "",
        ].join(" ")}
        style={{
          backgroundImage: empty ? "linear-gradient(145deg, #ebe0d0 0%, #ddd2bc 100%)" : paperFaceBg,
          backgroundColor: "#f0e6d6",
          boxShadow: faceShadow,
          border:
            side === "left"
              ? "1px solid rgba(62,48,28,0.1)"
              : "1px solid rgba(62,48,28,0.1)",
        }}
      >
        {/* Printed margin / plate impression */}
        {!empty && (
          <div
            className="pointer-events-none absolute inset-[10px] rounded-sm opacity-40 sm:inset-[12px]"
            style={{
              border: "1px solid rgba(90,72,52,0.06)",
              boxShadow: "inset 0 0 40px rgba(90,72,52,0.04)",
            }}
          />
        )}

        {!empty && (
          <div
            className="pointer-events-none absolute inset-0 opacity-45"
            style={{
              background:
                side === "left"
                  ? "linear-gradient(90deg, rgba(255,255,255,0.42) 0%, transparent 22%, transparent 100%)"
                  : "linear-gradient(270deg, rgba(255,255,255,0.42) 0%, transparent 22%, transparent 100%)",
            }}
          />
        )}

        {empty ? (
          <p className="text-center font-serif text-sm italic text-[#6b5c48]">—</p>
        ) : (
          <div className="relative z-[2] flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
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
                    textShadow: "0 0.5px 0 rgba(255,255,255,0.4)",
                  }}
                >
                  <span className="whitespace-pre-wrap">{p.text}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
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

  const pageTurnY = wide ? "7deg" : "3.5deg";

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden text-[#f0e6d4]"
      style={{
        background:
          "radial-gradient(ellipse 85% 55% at 50% -5%, rgba(212,168,72,0.22) 0%, transparent 45%), radial-gradient(ellipse 100% 70% at 50% 115%, rgba(0,0,0,0.55) 0%, transparent 42%), linear-gradient(168deg, #14100c 0%, #261c14 38%, #1a1410 72%, #0f0c0a 100%)",
      }}
    >
      {/* Vignette + study grain */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 100%), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.025) 3px, rgba(0,0,0,0.025) 6px)",
          opacity: 0.55,
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
            <header className="mb-7 text-center">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Now reading
              </p>
              <h1
                className="mx-auto mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#fdf6e9] drop-shadow sm:text-3xl"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 2px 0 rgba(0,0,0,0.4), 0 14px 32px rgba(0,0,0,0.5)",
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
            <div className="relative mx-auto max-w-[60rem] px-1 sm:px-2">
              {/* Warm pool under book */}
              <div
                className="absolute -bottom-4 left-1/2 h-36 w-[min(96%,600px)] -translate-x-1/2 rounded-[50%] blur-2xl"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(201,162,39,0.32) 0%, rgba(120,80,30,0.12) 45%, transparent 70%)",
                }}
              />
              {/* Pedestal cap */}
              <div
                className="absolute bottom-1 left-1/2 z-0 h-4 w-[min(92%,520px)] -translate-x-1/2 rounded-sm"
                style={{
                  background: "linear-gradient(to bottom, #5a4330, #2a1f16)",
                  boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 z-0 h-14 w-[min(88%,480px)] -translate-x-1/2 rounded-b-md"
                style={{
                  background: "linear-gradient(to bottom, #3d2b1c 0%, #1a120c 55%, #0a0806 100%)",
                  boxShadow: "0 22px 48px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              />

              <div
                className="relative z-[1] mx-auto pb-14 pt-3"
                style={{ perspective: "2600px", perspectiveOrigin: "50% 32%" }}
              >
                {/* Leather boards: silhouette wider & deeper than pages */}
                <div
                  className="absolute left-1/2 top-5 z-0 w-[calc(100%+6px)] max-w-[54rem] -translate-x-1/2 rounded-b-[28px] rounded-t-[18px] sm:top-7"
                  style={{
                    height: "calc(100% - 0.25rem)",
                    minHeight: "min(64vh, 580px)",
                    background:
                      "linear-gradient(175deg, #4a3224 0%, #2c1a12 18%, #18100c 52%, #322218 82%, #4d3626 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.65), inset 0 3px 5px rgba(255,255,255,0.06), inset 0 -24px 40px rgba(0,0,0,0.65), 0 36px 72px rgba(0,0,0,0.7)",
                    transform: "translateZ(-22px) scale(1.045)",
                    transformStyle: "preserve-3d",
                  }}
                />
                {/* Board fore-edge thickness hints */}
                <div
                  className="pointer-events-none absolute left-[2%] top-8 z-[0] hidden h-[72%] w-2 rounded-sm opacity-70 sm:block"
                  style={{
                    background: "linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(60,42,28,0.5) 100%)",
                    boxShadow: "inset -1px 0 2px rgba(0,0,0,0.5)",
                  }}
                />
                <div
                  className="pointer-events-none absolute right-[2%] top-8 z-[0] hidden h-[72%] w-2 rounded-sm opacity-70 sm:block"
                  style={{
                    background: "linear-gradient(270deg, rgba(0,0,0,0.35) 0%, rgba(60,42,28,0.5) 100%)",
                    boxShadow: "inset 1px 0 2px rgba(0,0,0,0.5)",
                  }}
                />

                {/* Upper board / hinge highlight */}
                <div
                  className="pointer-events-none absolute left-1/2 top-4 z-[2] h-3 w-[88%] max-w-[46rem] -translate-x-1/2 rounded-full opacity-50 blur-sm"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,220,160,0.25), transparent)" }}
                />

                <div
                  className="relative z-[3] mx-auto max-w-[51rem] rounded-t-[12px] rounded-b-[20px] p-[10px] sm:p-3"
                  style={{
                    background: "linear-gradient(165deg, rgba(28,18,12,0.98) 0%, rgba(14,10,8,0.99) 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(201,162,39,0.18), 0 40px 80px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.04)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Gold tooling line (inner rim) */}
                  <div
                    className="pointer-events-none absolute inset-[7px] rounded-t-[8px] rounded-b-[16px] opacity-35"
                    style={{ boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.35)" }}
                  />

                  <div
                    className="relative rounded-[8px] p-1.5 sm:p-2"
                    style={{
                      background:
                        "linear-gradient(168deg, #352418 0%, #1f140e 45%, #2a1a12 100%), repeating-linear-gradient(-55deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 5px)",
                      boxShadow: "inset 0 4px 16px rgba(0,0,0,0.5), inset 0 -2px 0 rgba(255,255,255,0.03)",
                    }}
                  >
                    <div
                      className="flex flex-col items-stretch justify-center gap-0 sm:flex-row sm:gap-0"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div
                        className="min-w-0 flex-1 sm:max-w-[min(50%,24.5rem)] lg:max-w-[min(50%,26.5rem)]"
                        style={{
                          transform: `rotateY(${pageTurnY})`,
                          transformOrigin: "right center",
                          transformStyle: "preserve-3d",
                        }}
                      >
                        <PageFace paragraphs={leftPage} side="left" />
                      </div>

                      {/* Center gutter: crease + binding shadow */}
                      <div
                        className="relative hidden w-[12px] shrink-0 sm:block lg:w-[16px]"
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(35,24,16,0.98) 28%, #0c0806 50%, rgba(35,24,16,0.98) 72%, rgba(0,0,0,0.65) 100%)",
                          boxShadow:
                            "inset 0 0 28px rgba(0,0,0,1), inset 5px 0 10px rgba(0,0,0,0.45), inset -5px 0 10px rgba(0,0,0,0.45)",
                        }}
                      >
                        <div
                          className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-black/40"
                          style={{ boxShadow: "0 0 6px rgba(255,230,190,0.12)" }}
                        />
                      </div>

                      {wide ? (
                        <div
                          className="min-w-0 flex-1 sm:max-w-[min(50%,24.5rem)] lg:max-w-[min(50%,26.5rem)]"
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
              className="rounded-xl border border-[#5c4a2a]/55 p-4 shadow-2xl lg:sticky lg:top-6"
              style={{
                background: "linear-gradient(175deg, rgba(48,34,22,0.96) 0%, rgba(18,12,8,0.99) 100%)",
                boxShadow: "0 20px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#9a8470]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Scene
              </p>
              {sceneUrl ? (
                <div className="mt-3">
                  <img src={sceneUrl} alt="Illustration for this spread" className="w-full rounded-md border border-[#4a3c28]/50 shadow-lg" />
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
