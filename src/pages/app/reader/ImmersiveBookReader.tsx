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
  const count = 10;
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

/** Horizontal ruled texture on outer fore-edge (paper fibers). */
function ForeEdgeHorizontalRidges(props: { side: "left" | "right" }) {
  const edge = props.side === "left" ? "left-0" : "right-0";
  return (
    <div
      className={`pointer-events-none absolute inset-y-[16%] bottom-2 z-[2] w-[7px] sm:w-[8px] ${edge}`}
      aria-hidden
      style={{
        background: [
          "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(62,48,32,0.12) 2px, rgba(62,48,32,0.12) 3px)",
          props.side === "left"
            ? "linear-gradient(90deg, rgba(255,255,255,0.2), transparent)"
            : "linear-gradient(270deg, rgba(255,255,255,0.2), transparent)",
        ].join(","),
        opacity: 0.6,
      }}
    />
  );
}

/** Bottom of each page column: visible sheet stack stepping toward desk. */
function PageColumnBottomStack(props: { side: "left" | "right" }) {
  const inset = props.side === "left" ? "left-1 right-3" : "left-3 right-1";
  const n = 10;
  return (
    <div className={`pointer-events-none absolute bottom-0 z-[1] h-[13px] overflow-hidden ${inset}`} aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="absolute left-[2%] right-[2%] rounded-[1px] bg-gradient-to-r from-[#b0a080] via-[#f8f0e0] to-[#b0a080]"
          style={{
            bottom: i * 0.72,
            height: 1.2,
            opacity: 0.5 - i * 0.038,
            boxShadow: "0 1px 0 rgba(0,0,0,0.15)",
          }}
        />
      ))}
    </div>
  );
}

function PageStackEdges(props: { side: "left" | "right" }) {
  return (
    <>
      <CascadingPaperSheets side={props.side} />
      <PageBlockStack side={props.side} />
      <PaperEdgeLines side={props.side} />
      <ForeEdgeHorizontalRidges side={props.side} />
    </>
  );
}

/** Curved spine valley between pages (no flat black bar). */
function CenterGutterValley() {
  return (
    <div className="relative z-[4] hidden w-[24px] shrink-0 overflow-visible sm:block lg:w-[32px]" aria-hidden>
      <div
        className="pointer-events-none absolute inset-y-0 -left-1.5 -right-1.5 rounded-[999px]"
        style={{
          background:
            "radial-gradient(ellipse 42% 100% at 50% 50%, rgba(6,4,3,0.92) 0%, rgba(26,18,12,0.5) 44%, rgba(68,54,38,0.2) 72%, rgba(110,92,68,0.08) 100%)",
          boxShadow:
            "inset 0 0 16px rgba(0,0,0,0.75), inset 6px 0 12px rgba(0,0,0,0.22), inset -6px 0 12px rgba(0,0,0,0.22)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-6 left-0 w-[48%] rounded-l-full opacity-[0.88]"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,252,244,0.62) 0%, rgba(255,246,220,0.2) 58%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-6 right-0 w-[48%] rounded-r-full opacity-[0.88]"
        style={{
          background:
            "linear-gradient(270deg, rgba(255,252,244,0.62) 0%, rgba(255,246,220,0.2) 58%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-8 left-1/2 w-[2px] -translate-x-1/2 rounded-full opacity-75"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 18%, rgba(0,0,0,0.68) 50%, rgba(0,0,0,0.5) 82%, transparent 100%)",
          boxShadow: "0 0 12px rgba(0,0,0,0.5), 0 0 5px rgba(255,228,190,0.14)",
        }}
      />
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

  /* Tuned for wide landscape faces (no in-page scroll). */
  const maxCharsPerPage = wide ? 720 : 480;
  return { wide, maxCharsPerPage };
}

/** Open page parchment (labels + body). Stack edges belong on `PageBlockColumn`. */
function PageFace(props: { paragraphs: ReaderParagraph[]; side: "left" | "right"; empty?: boolean }) {
  const { paragraphs, side, empty } = props;
  const towardGutter = side === "left" ? "right" : "left";
  const roundMain = side === "left" ? "rounded-l-[16px] rounded-r-[6px]" : "rounded-r-[16px] rounded-l-[6px]";

  const foreEdgeShadow =
    side === "left"
      ? "2px 0 0 rgba(250,244,232,0.55), 5px 0 0 rgba(210,190,160,0.38), 10px 0 0 rgba(175,150,120,0.26), 16px 0 0 rgba(0,0,0,0.08)"
      : "-2px 0 0 rgba(250,244,232,0.55), -5px 0 0 rgba(210,190,160,0.38), -10px 0 0 rgba(175,150,120,0.26), -16px 0 0 rgba(0,0,0,0.08)";

  const curveShadow =
    side === "left"
      ? "inset 0 -10px 14px rgba(55,42,28,0.08), inset 18px 0 32px rgba(55,42,28,0.09), inset -2px 0 10px rgba(255,255,255,0.14)"
      : "inset 0 -10px 14px rgba(55,42,28,0.08), inset -18px 0 32px rgba(55,42,28,0.09), inset 2px 0 10px rgba(255,255,255,0.14)";

  const faceShadow =
    side === "left"
      ? `${curveShadow}, inset 0 -4px 10px rgba(255,255,255,0.32), 0 10px 20px rgba(0,0,0,0.18), ${foreEdgeShadow}`
      : `${curveShadow}, inset 0 -4px 10px rgba(255,255,255,0.32), 0 10px 20px rgba(0,0,0,0.18), ${foreEdgeShadow}`;

  return (
    <div className={`relative min-h-0 min-w-0 flex-1 overflow-visible ${roundMain}`}>
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
          "relative z-[3] flex min-h-[min(16vh,138px)] flex-1 flex-col overflow-hidden sm:min-h-[min(17vh,148px)] lg:min-h-[min(18vh,158px)] xl:min-h-[min(19vh,168px)]",
          roundMain,
          empty ? "items-stretch justify-stretch" : "",
        ].join(" ")}
        style={{
          backgroundImage: empty ? "linear-gradient(148deg, #f4ead8 0%, #e8dcc4 48%, #ddd0b8 100%)" : paperFaceBg,
          backgroundColor: "#f0e6d6",
          boxShadow: faceShadow,
          border: "1px solid rgba(62,48,28,0.09)",
          transform: side === "left" ? "rotateX(0.65deg)" : "rotateX(0.65deg)",
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

/** One side of the spread: stacked edges + bottom sheets + top page (rotates in 3D with block). */
function PageBlockColumn(props: {
  side: "left" | "right";
  transform: string;
  transformOrigin: string;
  paragraphs: ReaderParagraph[];
  empty?: boolean;
}) {
  const { side, transform, transformOrigin, paragraphs, empty } = props;
  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 basis-[50%] flex-col overflow-visible"
      style={{ transform, transformOrigin, transformStyle: "preserve-3d" }}
      data-book-part={side === "left" ? "page-block-left" : "page-block-right"}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
        <PageStackEdges side={side} />
      </div>
      <PageColumnBottomStack side={side} />
      <div className="relative z-[2] flex min-h-0 min-w-0 flex-1" data-book-part={side === "left" ? "left-top-page" : "right-top-page"}>
        <PageFace paragraphs={paragraphs} side={side} empty={empty} />
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

  const pageTurnY = wide ? "8deg" : "3.8deg";

  const brassPanel =
    "rounded-lg border-2 border-[#7a5c28]/70 bg-gradient-to-b from-[#2c2418] via-[#1a1510] to-[#120e0a] shadow-[inset_0_1px_0_rgba(255,214,160,0.12),inset_0_-2px_6px_rgba(0,0,0,0.45),0_10px_28px_rgba(0,0,0,0.55)]";

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden text-[#f0e6d4]"
      style={{
        background: [
          "radial-gradient(ellipse 72% 38% at 50% -2%, rgba(255,214,150,0.2) 0%, transparent 52%)",
          "radial-gradient(ellipse 80% 50% at 50% -8%, rgba(188,140,48,0.14) 0%, transparent 44%)",
          "radial-gradient(ellipse 95% 65% at 50% 108%, rgba(0,0,0,0.62) 0%, transparent 40%)",
          "linear-gradient(168deg, #0c0907 0%, #1e1610 34%, #14100c 72%, #080605 100%)",
        ].join(","),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 48% at 50% 38%, transparent 22%, rgba(0,0,0,0.58) 100%), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.024) 3px, rgba(0,0,0,0.024) 6px)",
          opacity: 0.55,
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

        <div className="mx-auto grid w-full max-w-[min(100vw-0.5rem,96rem)] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-10">
          {/* Main column: book + controls stay left; never overlap companion grid column */}
          <div className="book-hero-column relative z-0 flex min-w-0 flex-col items-stretch">
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

            <section
              className="book-stage relative z-0 mx-auto flex w-full max-w-full min-w-0 flex-col items-center overflow-hidden px-0 sm:px-1"
              aria-label="Open book on desk"
            >
              <div
                className="desk-surface relative z-0 w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-black/60 px-3 pb-10 pt-7 sm:rounded-[2rem] sm:px-6 sm:pb-12 sm:pt-9"
                style={{
                  background: [
                    "linear-gradient(192deg, rgba(52,38,28,0.96) 0%, rgba(26,18,12,0.99) 40%, rgba(12,9,7,1) 100%)",
                    "repeating-linear-gradient(88deg, rgba(255,255,255,0.028) 0 1px, transparent 1px 12px)",
                    "radial-gradient(ellipse 130% 70% at 50% -5%, rgba(92,68,48,0.4) 0%, transparent 52%)",
                  ].join(","),
                  boxShadow:
                    "inset 0 2px 0 rgba(255,220,190,0.05), inset 0 -18px 32px rgba(0,0,0,0.48), 0 26px 52px rgba(0,0,0,0.48)",
                }}
              >
                <div
                  className="pedestal-shadow pointer-events-none absolute bottom-4 left-1/2 z-0 h-44 w-[min(100%,42rem)] max-w-full -translate-x-1/2 rounded-[50%] blur-2xl"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(205,160,48,0.26) 0%, rgba(95,65,32,0.1) 48%, transparent 74%)",
                  }}
                />
                <div
                  className="pedestal-shadow pointer-events-none absolute bottom-2 left-1/2 z-0 h-4 w-[min(100%,36rem)] max-w-[92%] -translate-x-1/2 rounded-sm"
                  style={{
                    background: "linear-gradient(to bottom, #5c4634, #241a12)",
                    boxShadow: "0 4px 0 rgba(0,0,0,0.45)",
                  }}
                />
                <div
                  className="pedestal-shadow pointer-events-none absolute bottom-0 left-1/2 z-0 h-[3.25rem] w-[min(100%,34rem)] max-w-[90%] -translate-x-1/2 rounded-b-lg"
                  style={{
                    background: "linear-gradient(to bottom, #3a2a1e 0%, #140e0b 58%, #060403 100%)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                />

                <div className="relative z-[1] w-full max-w-full min-w-0 pt-1" style={{ perspective: "1650px", perspectiveOrigin: "50% 12%" }}>
                  <div
                    className="relative mx-auto w-full max-w-full min-w-0"
                    style={{
                      transform: "rotateX(4.2deg)",
                      transformOrigin: "50% 94%",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      className="leather-cover pointer-events-none absolute inset-x-1 top-2 z-0 rounded-b-[40px] rounded-t-[24px] sm:inset-x-2 sm:top-3"
                      style={{
                        height: "calc(100% - 0.12rem)",
                        minHeight: "min(28vh, 270px)",
                        width: "auto",
                        background:
                          "linear-gradient(176deg, #4d3828 0%, #281810 20%, #0e0906 48%, #241610 74%, #52402c 100%)",
                        boxShadow:
                          "0 0 0 1px rgba(0,0,0,0.78), inset 0 3px 5px rgba(255,255,255,0.04), inset 0 -28px 42px rgba(0,0,0,0.7), 0 36px 72px rgba(0,0,0,0.7)",
                        transform: "translateZ(-30px) scale(1.02)",
                        transformStyle: "preserve-3d",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute left-[1%] top-6 z-[1] hidden h-[82%] w-2.5 rounded-sm opacity-80 sm:block"
                      style={{
                        background: "linear-gradient(90deg, rgba(0,0,0,0.42) 0%, rgba(55,38,26,0.58) 100%)",
                        boxShadow: "inset -1px 0 3px rgba(0,0,0,0.55)",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute right-[1%] top-6 z-[1] hidden h-[82%] w-2.5 rounded-sm opacity-80 sm:block"
                      style={{
                        background: "linear-gradient(270deg, rgba(0,0,0,0.42) 0%, rgba(55,38,26,0.58) 100%)",
                        boxShadow: "inset 1px 0 3px rgba(0,0,0,0.55)",
                      }}
                    />
                    <div
                      className="pointer-events-none absolute left-1/2 top-2 z-[2] h-3 w-[92%] max-w-full -translate-x-1/2 rounded-full opacity-50 blur-sm"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,210,150,0.24), transparent)" }}
                    />

                    <div
                      className="relative z-[3] mx-auto w-full max-w-full min-w-0 overflow-visible rounded-t-[16px] rounded-b-[26px] p-[10px] sm:p-3"
                      style={{
                        background: "linear-gradient(165deg, rgba(22,15,10,0.99) 0%, rgba(8,6,5,1) 100%)",
                        boxShadow:
                          "0 0 0 1px rgba(185,145,48,0.14), 0 38px 76px rgba(0,0,0,0.58), inset 0 2px 0 rgba(255,255,255,0.03)",
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-[7px] rounded-t-[12px] rounded-b-[20px] opacity-[0.11]"
                        style={{ boxShadow: "inset 0 0 0 1px rgba(212,170,64,0.3)" }}
                      />

                      <div
                        className="relative max-w-full min-w-0 overflow-visible rounded-[12px] p-1 sm:p-1.5"
                        style={{
                          background:
                            "linear-gradient(168deg, #2e2016 0%, #16100c 46%, #20140e 100%), repeating-linear-gradient(-52deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 5px)",
                          boxShadow: "inset 0 3px 16px rgba(0,0,0,0.52), inset 0 -2px 0 rgba(255,255,255,0.02)",
                        }}
                      >
                        <div className="relative max-w-full min-w-0 overflow-visible" style={{ transformStyle: "preserve-3d" }}>
                          <BottomPageStackShadow />
                          <div className="relative max-w-full min-w-0 overflow-visible pb-2" style={{ transformStyle: "preserve-3d" }}>
                            <div className="relative flex max-w-full min-w-0 flex-row items-stretch gap-0 overflow-visible" style={{ transformStyle: "preserve-3d" }}>
                              <PageBlockColumn
                                side="left"
                                transform={`rotateY(${pageTurnY})`}
                                transformOrigin="right center"
                                paragraphs={leftPage}
                              />
                              {wide ? <CenterGutterValley /> : null}
                              {wide ? (
                                <PageBlockColumn
                                  side="right"
                                  transform={`rotateY(-${pageTurnY})`}
                                  transformOrigin="left center"
                                  paragraphs={rightPage ?? []}
                                  empty={!rightPage || rightPage.length === 0}
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ControlDeck */}
            <div className={`control-deck relative z-[2] mx-auto mt-4 w-full max-w-full min-w-0 px-0 sm:px-1 ${brassPanel} p-3 sm:p-3.5`}>
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

            <div className="reader-chapter-nav mx-auto mt-4 w-full max-w-full min-w-0 border-t border-[#4a3c28]/45 pt-4">
              <ReaderChapterNav bookId={bookId} prevSlug={prevChapterSlug} nextSlug={nextChapterSlug} layout="footer" variant="library" />
            </div>
          </div>

          <aside
            className="companion-panel relative z-20 mx-auto w-full min-w-0 max-w-full shrink-0 opacity-95 lg:mx-0 lg:mt-0 lg:w-full lg:max-w-none lg:pt-1 lg:opacity-100"
            aria-label="AIStoryCast companion"
          >
            <div
              className="relative z-10 flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-[#2a2218]/90 bg-gradient-to-b from-[#1a1510]/95 to-[#0d0a08]/98 p-3 shadow-md sm:rounded-2xl sm:p-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:p-5"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgba(255,214,160,0.07), 0 8px 24px rgba(0,0,0,0.38), 0 1px 3px rgba(0,0,0,0.42)",
              }}
            >
              <p
                className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#8a7a68] sm:text-[0.62rem]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Companion
              </p>
              <div
                role="tablist"
                aria-label="Companion sections"
                className="mt-3 flex gap-1 rounded-md border border-[#4a3820]/70 bg-[#0f0c09]/90 p-1 shadow-inner"
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
                        "min-w-0 flex-1 rounded-md px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-wide transition-colors sm:px-2.5 sm:text-xs",
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

              <div className="mt-4 flex min-h-0 flex-1 flex-col">
                {companionTab === "scene" ? (
                  <div
                    role="tabpanel"
                    id="companion-panel-scene"
                    aria-labelledby="companion-tab-scene"
                    className="flex min-h-0 flex-1 flex-col gap-4"
                  >
                    {sceneLoading ? (
                      <p className="text-sm leading-relaxed text-[#c4b4a0]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        Generating illustration…
                      </p>
                    ) : null}
                    {sceneError ? (
                      <p className="text-sm leading-relaxed text-amber-200/95" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {sceneError}
                      </p>
                    ) : null}
                    {sceneUrl ? (
                      <>
                        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border-2 border-[#6b5428]/70 bg-[#070504] p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6),0_4px_14px_rgba(0,0,0,0.45)] sm:p-2">
                          <img
                            src={sceneUrl}
                            alt="Illustration for this spread"
                            className="mx-auto h-auto w-full max-h-[min(42vh,360px)] rounded-sm object-contain shadow-lg sm:max-h-[min(48vh,400px)] lg:max-h-[min(52vh,440px)]"
                          />
                        </div>
                        {sceneFilename ? (
                          <p
                            className="truncate text-xs text-[#8a7a66]"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                            title={sceneFilename}
                          >
                            {sceneFilename}
                          </p>
                        ) : null}
                      </>
                    ) : !sceneLoading && !sceneError ? (
                      <p className="text-sm leading-relaxed text-[#b0a090]" style={{ fontFamily: "'Lora', serif" }}>
                        Generate an illustration from the current open pages.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onShowScene}
                      disabled={sceneLoading || spreadPlainText.trim().length === 0}
                      className="mt-auto w-full rounded-md border border-[#9a7418]/85 bg-gradient-to-b from-[#6b4e1c] to-[#342210] px-4 py-3 text-sm font-semibold text-[#fdf6e9] shadow-md transition-colors hover:from-[#7a5a22] hover:to-[#403018] disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="flex min-h-0 flex-1 flex-col gap-4"
                  >
                    <p className="text-sm leading-relaxed text-[#b0a090]" style={{ fontFamily: "'Lora', serif" }}>
                      Analysis coming next. AIStoryCast will explain this page, summarize the action, and highlight important context.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-[#5c4a2a]/50 bg-[#120e0c]/85 px-4 py-3 text-sm font-medium text-[#6a5c4e]"
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
                    className="flex min-h-0 flex-1 flex-col gap-4"
                  >
                    <p className="text-sm leading-relaxed text-[#b0a090]" style={{ fontFamily: "'Lora', serif" }}>
                      Secrets coming next. This will reveal symbolism, foreshadowing, literary references, and hidden details in the current passage.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-[#5c4a2a]/50 bg-[#120e0c]/85 px-4 py-3 text-sm font-medium text-[#6a5c4e]"
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
