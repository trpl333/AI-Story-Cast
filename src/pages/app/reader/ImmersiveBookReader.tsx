import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { ReaderParagraph } from "@/data/curatedChapters";
import { requestSceneImage, revokeSceneObjectUrl } from "@/lib/aistorycastSceneImage";
import { chunkParagraphsIntoPages, paragraphsToPlainText } from "./bookPagination";
import { ReaderChapterNav } from "./ReaderChapterNav";

const paperFaceBg = [
  "radial-gradient(ellipse 120% 45% at 50% 0%, rgba(255,255,255,0.24) 0%, transparent 52%)",
  "repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(88,70,48,0.04) 20px, rgba(88,70,48,0.04) 21px)",
  "repeating-linear-gradient(90deg, transparent 0px, transparent 26px, rgba(72,56,40,0.03) 26px, rgba(72,56,40,0.03) 27px)",
  "linear-gradient(162deg, #fdf8ee 0%, #f2e8d4 40%, #e5d6be 100%)",
].join(", ");

/** Physical stacked sheet layers (offset divs) on outside fore-edge. */
function CascadingPaperSheets(props: { side: "left" | "right" }) {
  const { side } = props;
  const count = 9;
  const outward = side === "left";
  return (
    <div
      className={`pointer-events-none absolute inset-y-2 bottom-3 z-0 ${outward ? "left-0" : "right-0"}`}
      style={{ width: "min(32px, 7%)" }}
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        const step = 1.65;
        const shift = 3 + i * step;
        return (
          <div
            key={i}
            className="absolute top-1.5 bottom-2 rounded-[4px]"
            style={{
              width: "calc(100% - 4px)",
              ...(outward
                ? { left: -shift, boxShadow: "-2px 1px 4px rgba(0,0,0,0.12), inset 1px 0 0 rgba(255,255,255,0.25)" }
                : { right: -shift, boxShadow: "2px 1px 4px rgba(0,0,0,0.12), inset -1px 0 0 rgba(255,255,255,0.22)" }),
              background: "linear-gradient(180deg, #fffdf8 0%, #efe4d2 42%, #d8c8a8 100%)",
              opacity: Math.max(0.12, 0.82 - i * 0.08),
              zIndex: -i,
              border: "1px solid rgba(55,42,28,0.06)",
            }}
          />
        );
      })}
    </div>
  );
}

/** Thin paper-edge lines for fore-edge / tail (Da Vinci–style stack illusion). */
function PaperEdgeLines(props: { side: "left" | "right"; className?: string }) {
  const { side, className = "" } = props;
  const lines = 18;
  const toward = side === "left" ? "left" : "right";
  return (
    <div
      className={`pointer-events-none absolute inset-y-2 z-[1] overflow-hidden ${toward === "left" ? "left-0" : "right-0"} w-[11px] sm:w-[13px] ${className}`}
      aria-hidden
    >
      {Array.from({ length: lines }).map((_, i) => {
        const offset = i * 0.75;
        const style: CSSProperties =
          toward === "left"
            ? { left: offset, width: 1.25, top: "4%", bottom: "4%" }
            : { right: offset, width: 1.25, top: "4%", bottom: "4%" };
        return (
          <div
            key={i}
            className="absolute rounded-[1px] bg-gradient-to-b from-[#fffdf6] via-[#e8dcc8] to-[#c9b89a]"
            style={{
              ...style,
              opacity: 0.55 - i * 0.028,
              boxShadow: toward === "left" ? "1px 0 0 rgba(0,0,0,0.12)" : "-1px 0 0 rgba(0,0,0,0.12)",
            }}
          />
        );
      })}
    </div>
  );
}

/** Extra fore-edge thickness via stacked box-shadows (under sheets). */
function PageBlockStack(props: { side: "left" | "right" }) {
  const { side } = props;
  const toward = side === "left" ? "left" : "right";
  const shadowLayers =
    side === "left"
      ? [
          "inset -2px 0 4px rgba(0,0,0,0.18)",
          "-1px 0 0 rgba(252,246,232,0.95)",
          "-2px 0 0 rgba(240,228,210,0.9)",
          "-4px 0 0 rgba(225,205,178,0.75)",
          "-7px 0 0 rgba(200,175,145,0.55)",
          "-11px 0 0 rgba(165,140,110,0.4)",
          "-16px 0 0 rgba(120,98,75,0.28)",
          "-21px 0 0 rgba(70,55,40,0.18)",
          "-26px 0 0 rgba(30,24,18,0.1)",
        ].join(", ")
      : [
          "inset 2px 0 4px rgba(0,0,0,0.18)",
          "1px 0 0 rgba(252,246,232,0.95)",
          "2px 0 0 rgba(240,228,210,0.9)",
          "4px 0 0 rgba(225,205,178,0.75)",
          "7px 0 0 rgba(200,175,145,0.55)",
          "11px 0 0 rgba(165,140,110,0.4)",
          "16px 0 0 rgba(120,98,75,0.28)",
          "21px 0 0 rgba(70,55,40,0.18)",
          "26px 0 0 rgba(30,24,18,0.1)",
        ].join(", ");

  return (
    <div
      className={`pointer-events-none absolute inset-y-1 z-0 ${toward === "left" ? "left-0" : "right-0"} w-6 sm:w-7`}
      style={{ boxShadow: shadowLayers }}
      aria-hidden
    />
  );
}

/** Bottom “block” shadow under open pages. */
function BottomPageStackShadow() {
  return (
    <div
      className="pointer-events-none absolute -bottom-1 left-[6%] right-[6%] z-0 h-4 sm:h-5"
      style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)",
        borderRadius: "0 0 40% 40% / 0 0 100% 100%",
        filter: "blur(4px)",
        opacity: 0.85,
      }}
      aria-hidden
    />
  );
}

/** Tail-edge paper lines along bottom of spread (stacked sheets). */
function BottomPaperEdgeLines() {
  const lines = 12;
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-0 z-[2] h-[11px] overflow-hidden sm:inset-x-5" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => {
        const offset = i * 0.85;
        return (
          <div
            key={i}
            className="absolute left-[3%] right-[3%] rounded-[1px] bg-gradient-to-r from-[#c9b89a] via-[#f5edd8] to-[#c9b89a]"
            style={{
              bottom: offset,
              height: 1.1,
              opacity: 0.5 - i * 0.04,
              boxShadow: "0 1px 0 rgba(0,0,0,0.12)",
            }}
          />
        );
      })}
    </div>
  );
}

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

  /* Slightly fewer chars on wide layout so text fits landscape faces without internal scroll. */
  const maxCharsPerPage = wide ? 860 : 520;
  return { wide, maxCharsPerPage };
}

/** Renders imported/seed paragraphs only. Enhanced narration text is not wired in the reader yet. */
function PageFace(props: { paragraphs: ReaderParagraph[]; side: "left" | "right"; empty?: boolean }) {
  const { paragraphs, side, empty } = props;
  const towardGutter = side === "left" ? "right" : "left";
  const roundMain = side === "left" ? "rounded-l-[14px] rounded-r-[5px]" : "rounded-r-[14px] rounded-l-[5px]";

  const foreEdgeShadow =
    side === "left"
      ? "2px 0 0 rgba(250,244,232,0.55), 5px 0 0 rgba(210,190,160,0.38), 10px 0 0 rgba(175,150,120,0.26), 16px 0 0 rgba(0,0,0,0.08)"
      : "-2px 0 0 rgba(250,244,232,0.55), -5px 0 0 rgba(210,190,160,0.38), -10px 0 0 rgba(175,150,120,0.26), -16px 0 0 rgba(0,0,0,0.08)";

  /* Stronger roll into spine: darker sweep near gutter + lift on outer edge */
  const curveShadow =
    side === "left"
      ? "inset 0 -12px 16px rgba(55,42,28,0.07), inset 14px 0 28px rgba(55,42,28,0.07), inset -2px 0 8px rgba(255,255,255,0.12)"
      : "inset 0 -12px 16px rgba(55,42,28,0.07), inset -14px 0 28px rgba(55,42,28,0.07), inset 2px 0 8px rgba(255,255,255,0.12)";

  const faceShadow =
    side === "left"
      ? `${curveShadow}, inset 0 -4px 10px rgba(255,255,255,0.32), 0 10px 20px rgba(0,0,0,0.18), ${foreEdgeShadow}`
      : `${curveShadow}, inset 0 -4px 10px rgba(255,255,255,0.32), 0 10px 20px rgba(0,0,0,0.18), ${foreEdgeShadow}`;

  return (
    <div className={`relative min-h-0 min-w-0 flex-1 overflow-visible ${roundMain}`}>
      <CascadingPaperSheets side={side} />
      <PageBlockStack side={side} />
      <PaperEdgeLines side={side} />

      {!empty && (
        <div
          className={`pointer-events-none absolute inset-y-3 z-[2] ${towardGutter === "right" ? "right-0" : "left-0"} w-[6px] sm:w-[8px]`}
          style={{
            background:
              towardGutter === "right"
                ? "linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(245,236,218,0.45) 42%, rgba(255,255,255,0.12) 100%)"
                : "linear-gradient(270deg, rgba(0,0,0,0.14) 0%, rgba(245,236,218,0.45) 42%, rgba(255,255,255,0.12) 100%)",
            boxShadow: towardGutter === "right" ? "inset 2px 0 4px rgba(0,0,0,0.12)" : "inset -2px 0 4px rgba(0,0,0,0.12)",
          }}
        />
      )}

      <div
        className={[
          "relative z-[3] flex min-h-[min(22vh,180px)] flex-1 flex-col overflow-hidden sm:min-h-[min(24vh,200px)] lg:min-h-[min(25vh,215px)] xl:min-h-[min(26vh,228px)]",
          roundMain,
          empty ? "items-stretch justify-stretch" : "",
        ].join(" ")}
        style={{
          backgroundImage: empty ? "linear-gradient(148deg, #f4ead8 0%, #e8dcc4 48%, #ddd0b8 100%)" : paperFaceBg,
          backgroundColor: "#f0e6d6",
          boxShadow: faceShadow,
          border: "1px solid rgba(62,48,28,0.09)",
          transform: side === "left" ? "rotateX(0.9deg)" : "rotateX(0.9deg)",
          transformOrigin: side === "left" ? "right center" : "left center",
        }}
      >
        {!empty && (
          <div
            className="pointer-events-none absolute inset-[8px] rounded-[5px] opacity-40 sm:inset-[12px] lg:inset-[14px]"
            style={{
              border: "1px solid rgba(90,72,52,0.07)",
              boxShadow: "inset 0 0 36px rgba(90,72,52,0.045)",
            }}
          />
        )}

        {!empty && (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                side === "left"
                  ? "linear-gradient(90deg, rgba(255,255,255,0.38) 0%, transparent 20%, transparent 100%)"
                  : "linear-gradient(270deg, rgba(255,255,255,0.38) 0%, transparent 20%, transparent 100%)",
            }}
          />
        )}

        {empty ? (
          <div className="h-full min-h-[inherit] w-full bg-transparent" aria-hidden />
        ) : (
          <div className="relative z-[2] flex flex-1 flex-col gap-2.5 overflow-hidden px-4 py-4 sm:gap-3 sm:px-8 sm:py-5 lg:px-10 lg:py-5">
            {paragraphs.map((p, idx) => (
              <div key={idx}>
                <p
                  className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#6e5c42] sm:text-[0.6rem]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {p.label}
                </p>
                <p
                  className="mt-0.5 text-[0.95rem] leading-[1.62] text-[#241c14] sm:text-[1.04rem] lg:text-[1.07rem]"
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

type CompanionTab = "scene" | "analysis" | "secrets";

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
  const [companionTab, setCompanionTab] = useState<CompanionTab>("scene");
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
    setCompanionTab("scene");
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

  const pageTurnY = wide ? "7.5deg" : "3.5deg";

  const brassPanel =
    "rounded-lg border-2 border-[#7a5c28]/70 bg-gradient-to-b from-[#2c2418] via-[#1a1510] to-[#120e0a] shadow-[inset_0_1px_0_rgba(255,214,160,0.12),inset_0_-2px_6px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.55)]";

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden text-[#f0e6d4]"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -8%, rgba(188,140,48,0.18) 0%, transparent 42%), radial-gradient(ellipse 95% 65% at 50% 108%, rgba(0,0,0,0.58) 0%, transparent 40%), linear-gradient(168deg, #100d0a 0%, #221810 36%, #16120e 70%, #0a0806 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 52% at 50% 42%, transparent 28%, rgba(0,0,0,0.52) 100%), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.022) 3px, rgba(0,0,0,0.022) 6px)",
          opacity: 0.5,
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[min(100%,96rem)] px-3 pb-10 pt-5 sm:px-5 lg:px-8">
        <nav
          className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#b9a88a]"
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

        <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:justify-center lg:gap-5 xl:gap-6">
          {/* Main column: book dominates width */}
          <div className="min-w-0 w-full lg:flex-1 lg:max-w-[min(100%,84rem)]">
            <header className="mb-5 text-center lg:mb-6">
              <p
                className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[#9a8470]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Now reading
              </p>
              <h1
                className="mx-auto mt-1.5 max-w-4xl text-2xl font-semibold leading-tight text-[#fdf6e9] drop-shadow sm:text-3xl"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  textShadow: "0 2px 0 rgba(0,0,0,0.4), 0 12px 28px rgba(0,0,0,0.45)",
                }}
              >
                {chapterHeading}
              </h1>
              {author ? (
                <p className="mt-1.5 text-sm text-[#c4b49a]" style={{ fontFamily: "'Lora', serif" }}>
                  {author}
                </p>
              ) : null}
            </header>

            <div className="relative mx-auto w-full max-w-[min(98vw,80rem)] px-0 sm:px-1">
              <div
                className="absolute -bottom-2 left-1/2 z-0 h-36 w-[min(100%,820px)] -translate-x-1/2 rounded-[50%] blur-2xl"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(195,150,42,0.28) 0%, rgba(100,70,32,0.1) 48%, transparent 72%)",
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 z-0 h-3.5 w-[min(96%,720px)] -translate-x-1/2 rounded-sm"
                style={{
                  background: "linear-gradient(to bottom, #5a4330, #241a12)",
                  boxShadow: "0 3px 0 rgba(0,0,0,0.4)",
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 z-0 h-12 w-[min(92%,680px)] -translate-x-1/2 rounded-b-md"
                style={{
                  background: "linear-gradient(to bottom, #3a2818 0%, #16100c 55%, #080605 100%)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              />

              <div className="relative z-[1] pb-12 pt-2" style={{ perspective: "1900px", perspectiveOrigin: "50% 24%" }}>
                {/* Outer leather cover — wider than page block */}
                <div
                  className="absolute left-1/2 top-4 z-0 w-[calc(100%+18px)] max-w-[88rem] -translate-x-1/2 rounded-b-[36px] rounded-t-[22px] sm:top-5"
                  style={{
                    height: "calc(100% - 0.2rem)",
                    minHeight: "min(34vh, 320px)",
                    background:
                      "linear-gradient(176deg, #453024 0%, #261610 22%, #120c09 50%, #2a1a12 78%, #4a3424 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.05), inset 0 -22px 36px rgba(0,0,0,0.62), 0 32px 64px rgba(0,0,0,0.65)",
                    transform: "translateZ(-26px) scale(1.04)",
                    transformStyle: "preserve-3d",
                  }}
                />
                <div
                  className="pointer-events-none absolute left-[1.5%] top-7 z-[1] hidden h-[78%] w-2.5 rounded-sm opacity-75 sm:block"
                  style={{
                    background: "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(55,38,26,0.55) 100%)",
                    boxShadow: "inset -1px 0 3px rgba(0,0,0,0.55)",
                  }}
                />
                <div
                  className="pointer-events-none absolute right-[1.5%] top-7 z-[1] hidden h-[78%] w-2.5 rounded-sm opacity-75 sm:block"
                  style={{
                    background: "linear-gradient(270deg, rgba(0,0,0,0.4) 0%, rgba(55,38,26,0.55) 100%)",
                    boxShadow: "inset 1px 0 3px rgba(0,0,0,0.55)",
                  }}
                />
                <div
                  className="pointer-events-none absolute left-1/2 top-3 z-[2] h-2.5 w-[92%] max-w-[76rem] -translate-x-1/2 rounded-full opacity-45 blur-sm"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,210,150,0.22), transparent)" }}
                />

                <div
                  className="relative z-[3] mx-auto w-full overflow-visible rounded-t-[14px] rounded-b-[22px] p-[9px] sm:p-2.5"
                  style={{
                    background: "linear-gradient(165deg, rgba(24,16,11,0.98) 0%, rgba(10,8,6,0.99) 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(190,150,48,0.16), 0 36px 72px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.035)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-[6px] rounded-t-[10px] rounded-b-[18px] opacity-[0.12]"
                    style={{ boxShadow: "inset 0 0 0 1px rgba(212,170,64,0.32)" }}
                  />

                  <div
                    className="relative overflow-visible rounded-[10px] p-1 sm:p-1.5"
                    style={{
                      background:
                        "linear-gradient(168deg, #322218 0%, #1a100c 46%, #241610 100%), repeating-linear-gradient(-52deg, transparent, transparent 4px, rgba(0,0,0,0.055) 4px, rgba(0,0,0,0.055) 5px)",
                      boxShadow: "inset 0 3px 14px rgba(0,0,0,0.48), inset 0 -2px 0 rgba(255,255,255,0.025)",
                    }}
                  >
                    <div className="relative overflow-visible" style={{ transformStyle: "preserve-3d" }}>
                      <BottomPageStackShadow />

                      <div className="relative overflow-visible pb-2" style={{ transformStyle: "preserve-3d" }}>
                        <BottomPaperEdgeLines />
                        <div className="relative flex flex-row items-stretch gap-0 overflow-visible" style={{ transformStyle: "preserve-3d" }}>
                        {/* Left page column: stacked block + top page */}
                        <div
                          className="relative min-h-0 min-w-0 flex-1 basis-[50%] overflow-visible"
                          style={{
                            transform: `rotateY(${pageTurnY})`,
                            transformOrigin: "right center",
                            transformStyle: "preserve-3d",
                          }}
                        >
                          <PageFace paragraphs={leftPage} side="left" />
                        </div>

                        {/* Curved binding valley (not a flat black bar) */}
                        <div className="relative z-[4] hidden w-[22px] shrink-0 overflow-visible sm:block lg:w-[30px]">
                          <div
                            className="pointer-events-none absolute inset-y-1 -left-1 -right-1 rounded-[999px]"
                            style={{
                              background:
                                "radial-gradient(ellipse 48% 100% at 50% 50%, rgba(8,5,4,0.92) 0%, rgba(28,20,14,0.55) 42%, rgba(72,58,42,0.22) 72%, rgba(120,100,78,0.08) 100%)",
                              boxShadow:
                                "inset 0 0 12px rgba(0,0,0,0.65), inset 5px 0 10px rgba(0,0,0,0.25), inset -5px 0 10px rgba(0,0,0,0.25)",
                            }}
                          />
                          <div
                            className="pointer-events-none absolute inset-y-5 left-0 w-[46%] rounded-l-full opacity-90"
                            style={{
                              background:
                                "linear-gradient(90deg, rgba(255,252,242,0.55) 0%, rgba(255,248,230,0.18) 55%, transparent 100%)",
                            }}
                          />
                          <div
                            className="pointer-events-none absolute inset-y-5 right-0 w-[46%] rounded-r-full opacity-90"
                            style={{
                              background:
                                "linear-gradient(270deg, rgba(255,252,242,0.55) 0%, rgba(255,248,230,0.18) 55%, transparent 100%)",
                            }}
                          />
                          <div
                            className="pointer-events-none absolute inset-y-7 left-1/2 w-[2px] -translate-x-1/2 rounded-full opacity-80"
                            style={{
                              background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 22%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.55) 78%, transparent 100%)",
                              boxShadow: "0 0 10px rgba(0,0,0,0.55), 0 0 4px rgba(255,230,190,0.12)",
                            }}
                          />
                        </div>

                        {wide ? (
                          <div
                            className="relative min-h-0 min-w-0 flex-1 basis-[50%] overflow-visible"
                            style={{
                              transform: `rotateY(-${pageTurnY})`,
                              transformOrigin: "left center",
                              transformStyle: "preserve-3d",
                            }}
                          >
                            <PageFace paragraphs={rightPage ?? []} side="right" empty={!rightPage || rightPage.length === 0} />
                          </div>
                        ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls: clustered under book (brass / leather desk) */}
            <div className={`relative z-[2] mx-auto mt-3 w-full max-w-[min(98vw,80rem)] px-0 sm:px-1 ${brassPanel} p-3 sm:p-4`}>
              <div className="pointer-events-none absolute left-2 top-2 h-2 w-2 rounded-full bg-[#c9a227]/35 shadow-inner ring-1 ring-[#5c4a2a]/60" />
              <div className="pointer-events-none absolute right-2 top-2 h-2 w-2 rounded-full bg-[#c9a227]/35 shadow-inner ring-1 ring-[#5c4a2a]/60" />

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#5c4a2a]/55 bg-[#140f0c]/90 p-1 shadow-inner">
                    <button
                      type="button"
                      aria-current="true"
                      className="rounded-md bg-[#b8921f] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#1a1308] shadow-sm"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Exact text
                    </button>
                    <button
                      type="button"
                      disabled={true}
                      aria-disabled="true"
                      title="Enhanced narration text coming next."
                      className="pointer-events-none cursor-not-allowed rounded-md border border-transparent bg-transparent px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#5c4f44] opacity-50"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Enhanced (coming next)
                    </button>
                  </div>
                  <p className="text-center text-[0.7rem] text-[#9a8a78] sm:text-left" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {spreadLabel}
                  </p>
                </div>

                <div className="flex flex-col gap-2 border-t border-[#4a3820]/55 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={goPrevPage}
                      disabled={!canPrevPage}
                      className="rounded-md border border-[#8a6a2a]/75 bg-gradient-to-b from-[#2e2418] to-[#1a140f] px-3.5 py-2 text-sm font-medium text-[#f0e6d4] shadow-sm transition-colors hover:border-[#c9a227]/55 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Previous page
                    </button>
                    <button
                      type="button"
                      onClick={goNextPage}
                      disabled={!canNextPage}
                      className="rounded-md border border-[#8a6a2a]/75 bg-gradient-to-b from-[#2e2418] to-[#1a140f] px-3.5 py-2 text-sm font-medium text-[#f0e6d4] shadow-sm transition-colors hover:border-[#c9a227]/55 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      Next page
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-md border border-[#5c4a2a]/45 bg-[#120e0c]/85 px-3.5 py-2 text-sm text-[#6a5c4e]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      title="Narration coming next"
                    >
                      Narration coming next
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-4 w-full max-w-[min(98vw,80rem)] border-t border-[#4a3c28]/45 pt-4">
              <ReaderChapterNav bookId={bookId} prevSlug={prevChapterSlug} nextSlug={nextChapterSlug} layout="footer" variant="library" />
            </div>
          </div>

          {/* AIStoryCast companion — compact floating card, not a full-height slab */}
          <aside
            className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:mt-1 lg:w-[248px] lg:min-w-[248px] lg:max-w-[248px] lg:pt-0 xl:w-[260px] xl:min-w-[260px] xl:max-w-[260px]"
            aria-label="AIStoryCast companion"
          >
            <div
              className={`${brassPanel} overflow-hidden rounded-2xl p-3 sm:p-3.5 lg:sticky lg:top-6`}
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,214,160,0.1), 0 10px 28px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.35)",
              }}
            >
              <p
                className="text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-[#a89878]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Companion
              </p>
              <div
                role="tablist"
                aria-label="Companion sections"
                className="mt-2.5 flex gap-0.5 rounded-md border border-[#4a3820]/70 bg-[#0f0c09]/90 p-0.5 shadow-inner"
              >
                {(
                  [
                    ["scene", "Scene"],
                    ["analysis", "Analysis"],
                    ["secrets", "Secrets"],
                  ] as const
                ).map(([id, label]) => {
                  const selected = companionTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={`companion-panel-${id}`}
                      id={`companion-tab-${id}`}
                      tabIndex={0}
                      onClick={() => setCompanionTab(id)}
                      className={[
                        "min-w-0 flex-1 rounded px-1.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-wide transition-colors sm:text-[0.65rem]",
                        selected
                          ? "bg-[#b8921f] text-[#1a1308] shadow-sm"
                          : "bg-transparent text-[#9a8a78] hover:bg-[#1f1812]/90 hover:text-[#d4c4a8]",
                      ].join(" ")}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 min-h-0">
                {companionTab === "scene" ? (
                  <div
                    role="tabpanel"
                    id="companion-panel-scene"
                    aria-labelledby="companion-tab-scene"
                    className="flex flex-col gap-3"
                  >
                    {sceneLoading ? (
                      <p className="text-[0.78rem] leading-relaxed text-[#c4b4a0]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Generating illustration…
                      </p>
                    ) : null}
                    {sceneError ? (
                      <p className="text-[0.78rem] leading-relaxed text-amber-200/95" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {sceneError}
                      </p>
                    ) : null}
                    {sceneUrl ? (
                      <>
                        <div className="overflow-hidden rounded-md border border-[#6b5428]/65 bg-[#0c0907] p-1 shadow-inner">
                          <img
                            src={sceneUrl}
                            alt="Illustration for this spread"
                            className="max-h-[min(38vh,220px)] w-full rounded-sm object-cover object-top shadow-md"
                          />
                        </div>
                        {sceneFilename ? (
                          <p
                            className="truncate text-[0.65rem] text-[#8a7a66]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                            title={sceneFilename}
                          >
                            {sceneFilename}
                          </p>
                        ) : null}
                      </>
                    ) : !sceneLoading && !sceneError ? (
                      <p className="text-[0.78rem] leading-relaxed text-[#b0a090]" style={{ fontFamily: "'Lora', serif" }}>
                        Generate an illustration from the current open pages.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onShowScene}
                      disabled={sceneLoading || spreadPlainText.trim().length === 0}
                      className="w-full rounded-md border border-[#9a7418]/85 bg-gradient-to-b from-[#6b4e1c] to-[#342210] px-3 py-2.5 text-sm font-semibold text-[#fdf6e9] shadow-md transition-colors hover:from-[#7a5a22] hover:to-[#403018] disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {sceneLoading ? "Generating…" : "Show this scene"}
                    </button>
                  </div>
                ) : null}

                {companionTab === "analysis" ? (
                  <div
                    role="tabpanel"
                    id="companion-panel-analysis"
                    aria-labelledby="companion-tab-analysis"
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[0.78rem] leading-relaxed text-[#b0a090]" style={{ fontFamily: "'Lora', serif" }}>
                      Analysis coming next. AIStoryCast will explain this page, summarize the action, and highlight important context.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-[#5c4a2a]/50 bg-[#120e0c]/85 px-3 py-2.5 text-sm font-medium text-[#6a5c4e]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      title="Coming next"
                    >
                      Analyze this page
                    </button>
                  </div>
                ) : null}

                {companionTab === "secrets" ? (
                  <div
                    role="tabpanel"
                    id="companion-panel-secrets"
                    aria-labelledby="companion-tab-secrets"
                    className="flex flex-col gap-3"
                  >
                    <p className="text-[0.78rem] leading-relaxed text-[#b0a090]" style={{ fontFamily: "'Lora', serif" }}>
                      Secrets coming next. This will reveal symbolism, foreshadowing, literary references, and hidden details in the current passage.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-[#5c4a2a]/50 bg-[#120e0c]/85 px-3 py-2.5 text-sm font-medium text-[#6a5c4e]"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      title="Coming next"
                    >
                      Reveal secrets
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
