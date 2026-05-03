import { Link } from "react-router-dom";
import { readerChapterHref } from "@/data/libraryBooks";

const styles = {
  default: {
    primary:
      "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-40",
    secondary:
      "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40",
  },
  /** Warm reader scene: controls on dark wood. */
  library: {
    primary:
      "inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#c9a227] to-[#8a6b1b] px-5 py-2.5 text-sm font-semibold text-[#1a1308] shadow-md transition-colors hover:from-[#d4ae32] hover:to-[#9a7520] disabled:cursor-not-allowed disabled:opacity-40",
    secondary:
      "inline-flex items-center justify-center rounded-full border border-[#5c4a2a]/80 bg-[#2a1f14]/90 px-5 py-2.5 text-sm font-semibold text-[#f0e6d4] backdrop-blur-sm transition-colors hover:border-[#c9a227]/50 hover:bg-[#3d2e1c]/90",
  },
} as const;

const navDisabledClass = "cursor-not-allowed opacity-40";

export function ReaderChapterNav(props: {
  bookId: string;
  prevSlug: string | null;
  nextSlug: string | null;
  layout?: "header" | "footer";
  variant?: keyof typeof styles;
}) {
  const { bookId, prevSlug, nextSlug, layout = "header", variant = "default" } = props;
  const btnPrimary = styles[variant].primary;
  const btnSecondary = styles[variant].secondary;
  const prevTo = prevSlug ? readerChapterHref(bookId, prevSlug) : null;
  const nextTo = nextSlug ? readerChapterHref(bookId, nextSlug) : null;
  const primary = layout === "footer";

  return (
    <div className="flex flex-wrap gap-3">
      {prevTo ? (
        <Link className={btnSecondary} to={prevTo}>
          Previous chapter
        </Link>
      ) : (
        <span className={`${btnSecondary} ${navDisabledClass}`} aria-disabled="true">
          Previous chapter
        </span>
      )}
      {nextTo ? (
        <Link className={btnSecondary} to={nextTo}>
          Next chapter
        </Link>
      ) : (
        <span className={`${btnSecondary} ${navDisabledClass}`} aria-disabled="true">
          Next chapter
        </span>
      )}
      <Link className={primary ? btnPrimary : btnSecondary} to="/app/library">
        Back to Library
      </Link>
    </div>
  );
}
