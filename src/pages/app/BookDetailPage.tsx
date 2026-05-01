import { Link, useParams } from "react-router-dom";
import { getLibraryBook, isLibraryBookId, readerChapterPath, type LibraryBookDisplay } from "@/data/libraryBooks";

function ChapterRow({
  book,
  chapter,
}: {
  book: LibraryBookDisplay;
  chapter: LibraryBookDisplay["chapters"][number];
}) {
  const readPath = readerChapterPath(book.id, chapter.chapterId);

  if (chapter.readerEnabled) {
    return (
      <Link
        to={readPath}
        className="flex flex-col rounded-xl border border-[#E0D8CC] bg-[#FDFBF7] p-4 shadow-sm transition-all hover:border-[#C4873A]/50 hover:ring-1 hover:ring-[#C4873A]/15"
      >
        <span className="text-sm font-semibold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          {chapter.label}
        </span>
        {chapter.hasSeed ? (
          <span className="mt-2 text-xs font-medium text-[#C4873A]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Open in reader →
          </span>
        ) : (
          <span className="mt-2 text-xs text-[#6A5E4B]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Open reader — text may be limited until this chapter is seeded
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-[#E8E0D4] bg-[#F5F0E8] p-4 opacity-90">
      <span className="text-sm font-semibold text-[#5C5346]" style={{ fontFamily: "'Playfair Display', serif" }}>
        {chapter.label}
      </span>
      <span className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Coming soon
      </span>
    </div>
  );
}

export default function BookDetailPage() {
  const { bookId = "" } = useParams();
  const book = isLibraryBookId(bookId) ? getLibraryBook(bookId) : undefined;

  if (!book) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
          Book not found
        </h1>
        <p className="mt-3 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          We don&apos;t have a detail page for <code className="text-[#1C1A17]">{bookId || "—"}</code> yet.
        </p>
        <Link
          to="/app/library"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2C2416] px-6 py-3 text-sm font-semibold text-[#FAF8F4] hover:bg-[#3D3220]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <i className="ri-arrow-left-line" aria-hidden />
          Back to library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Link to="/app" className="hover:text-[#1C1A17]">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link to="/app/library" className="hover:text-[#1C1A17]">
          Library
        </Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-[#1C1A17]">{book.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-[#E0D8CC] bg-white shadow-sm">
          <div className="aspect-[3/4] bg-[#F5F0E8]">
            <img src={book.cover} alt="" className="h-full w-full object-cover object-top" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Book
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#1C1A17] md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            {book.title}
          </h1>
          <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {book.author}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {book.description}
          </p>

          <h2
            className="mt-10 text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Choose a chapter
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {book.chapters.map((chapter) => (
              <ChapterRow key={chapter.chapterId} book={book} chapter={chapter} />
            ))}
          </div>

          <Link
            to="/app/library"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#C4873A] hover:underline"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <i className="ri-arrow-left-line" aria-hidden />
            Back to library
          </Link>
        </div>
      </div>
    </div>
  );
}
