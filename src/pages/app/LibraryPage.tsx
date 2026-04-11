import { Link } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";
import { ALICE_CHAPTER_1_PATH } from "@/data/curatedChapters";

const sampleBooks = [
  {
    id: "alice",
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    tag: "Featured",
    cover: publicAsset("assets/home/alice-cover.jpg"),
    href: ALICE_CHAPTER_1_PATH,
  },
  {
    id: "pride",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    tag: "Coming soon",
    cover: publicAsset("assets/home/feat-05-curated.jpg"),
    href: null,
  },
  {
    id: "sherlock",
    title: "The Adventures of Sherlock Holmes",
    author: "Arthur Conan Doyle",
    tag: "Coming soon",
    cover: publicAsset("assets/home/why-different.jpg"),
    href: null,
  },
] as const;

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Curated library
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#1C1A17] md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
        Public-domain shelf
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Sample cards for layout only. <strong className="font-medium text-[#1C1A17]">Alice</strong> opens the seeded
        in-app reader (Chapter I); other titles unlock as ingestion and audio ship. The public <Link to="/demo" className="font-medium text-[#C4873A] hover:underline">/demo</Link> page stays a no-login teaser.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sampleBooks.map((book) => {
          const cardClass = `group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
            book.id === "alice" ? "border-[#C4873A]/40 ring-1 ring-[#C4873A]/20" : "border-[#E0D8CC] opacity-95"
          }`;
          const inner = (
            <>
              <div className="aspect-[4/3] overflow-hidden bg-[#F5F0E8]">
                <img src={book.cover} alt="" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span
                  className={`mb-2 w-fit rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    book.id === "alice" ? "bg-[#C4873A]/15 text-[#A66B2E]" : "bg-[#E8E0D4] text-[#5C5346]"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {book.tag}
                </span>
                <h2 className="text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {book.title}
                </h2>
                <p className="mt-1 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {book.author}
                </p>
                <span className="mt-4 text-sm font-semibold text-[#C4873A]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {book.href ? "Open in-app reader →" : "Ingestion pipeline — soon"}
                </span>
              </div>
            </>
          );
          return book.href ? (
            <Link key={book.id} to={book.href} className={`${cardClass} hover:border-[#C4B89A]`}>
              {inner}
            </Link>
          ) : (
            <div key={book.id} className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
