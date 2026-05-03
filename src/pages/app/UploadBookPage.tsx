import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { readerChapterHref } from "@/data/libraryBooks";
import { readShelfBooksFromStorage, writeShelfBooksToStorage, type ImportedShelfBook } from "@/lib/importedBookStorage";
import { persistUploadedTxtBook } from "@/lib/uploadLocalBook";

const panelClass =
  "rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm";

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] transition-colors hover:bg-[#3D3220] disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "inline-flex items-center justify-center rounded-full border border-[#E0D8CC] bg-[#FDFBF7] px-5 py-2.5 text-sm font-semibold text-[#1C1A17] transition-colors hover:border-[#C4873A]/40";

function defaultTitleFromFilename(name: string): string {
  const stem = name.replace(/[/\\]/g, "").replace(/\.[^.]+$/i, "").trim();
  return stem.length > 0 ? stem.replace(/_/g, " ") : "";
}

export default function UploadBookPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ shelfBook: ImportedShelfBook; chapterCount: number } | null>(null);

  function resetForm() {
    setPickedName(null);
    setTitle("");
    setAuthor("");
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPickedName(null);
      setTitle("");
      return;
    }
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".epub")) {
      setPickedName(null);
      setTitle("");
      if (inputRef.current) inputRef.current.value = "";
      setError("EPUB support coming next; upload .txt for now.");
      return;
    }
    if (!lower.endsWith(".txt")) {
      setPickedName(null);
      setTitle("");
      if (inputRef.current) inputRef.current.value = "";
      setError("Please choose a .txt file (EPUB is not supported yet).");
      return;
    }
    setPickedName(file.name);
    setTitle(defaultTitleFromFilename(file.name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a .txt file first.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Only .txt files are supported in this version.");
      return;
    }

    setBusy(true);
    try {
      const rawText = await file.text();
      const outcome = await persistUploadedTxtBook({
        rawText,
        title: title.trim(),
        author: author.trim(),
        originalFilename: file.name,
      });
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      const shelf = readShelfBooksFromStorage();
      if (!shelf.some((b) => b.id === outcome.shelfBook.id)) {
        writeShelfBooksToStorage([...shelf, outcome.shelfBook]);
      }
      setResult({ shelfBook: outcome.shelfBook, chapterCount: outcome.chapterCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Library
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#1C1A17] md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
          Upload book
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Add a plain-text (.txt) file from this device. Text stays in this browser (IndexedDB only — no server upload).
          The book appears in{" "}
          <Link to="/app/library" className="font-medium text-[#C4873A] underline-offset-2 hover:underline">
            My Library
          </Link>
          . Roadmap: <span className="font-medium text-[#1C1A17]">.txt</span> now,{" "}
          <span className="font-medium text-[#1C1A17]">.epub</span> next, <span className="font-medium text-[#1C1A17]">.pdf</span>{" "}
          later.
        </p>
      </div>

      <section className={panelClass}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block">
              <span className="text-xs font-medium text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
                File (.txt or .epub)
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".txt,.epub"
                className="mt-2 block w-full text-sm text-[#1C1A17] file:mr-4 file:rounded-full file:border-0 file:bg-[#2C2416] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#FAF8F4] hover:file:bg-[#3D3220]"
                onChange={onFileChange}
              />
            </label>
            {pickedName ? (
              <p className="mt-2 text-xs text-[#6B6355]" style={{ fontFamily: "'Inter', sans-serif" }}>
                Selected: {pickedName}
              </p>
            ) : null}
          </div>

          <label className="block">
            <span className="text-xs font-medium text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Title <span className="font-normal text-[#8B7B6B]">(optional)</span>
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[#E0D8CC] bg-white px-4 py-2.5 text-sm text-[#1C1A17] outline-none ring-[#C4873A]/25 focus:ring-2"
              style={{ fontFamily: "'Inter', sans-serif" }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults from filename"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Author <span className="font-normal text-[#8B7B6B]">(optional)</span>
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-[#E0D8CC] bg-white px-4 py-2.5 text-sm text-[#1C1A17] outline-none ring-[#C4873A]/25 focus:ring-2"
              style={{ fontFamily: "'Inter', sans-serif" }}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Unknown author if left blank"
              autoComplete="off"
            />
          </label>

          {error ? (
            <p className="text-sm text-[#8B4513]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary} type="submit" disabled={busy || !pickedName}>
              {busy ? "Saving…" : "Add to My Library"}
            </button>
            <Link className={btnSecondary} to="/app/library">
              Cancel
            </Link>
          </div>
        </form>

        {result ? (
          <div className="mt-8 border-t border-[#E8E0D4] pt-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Added to My Library
            </h2>
            <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="font-semibold text-[#1C1A17]">{result.shelfBook.title}</span> —{" "}
              {result.chapterCount} chapter{result.chapterCount === 1 ? "" : "s"} (or one full-text chapter if no
              headings were detected).
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={btnPrimary} to={readerChapterHref(result.shelfBook.id, "chapter-1")}>
                Open in reader
              </Link>
              <Link className={btnSecondary} to="/app/library">
                My Library
              </Link>
              <button type="button" className={btnSecondary} onClick={resetForm}>
                Upload another
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
