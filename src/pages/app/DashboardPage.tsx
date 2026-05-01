import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { libraryBookPath } from "@/data/libraryBooks";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        App home
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#1C1A17] md:text-4xl" style={{ fontFamily: "'Playfair Display', serif" }}>
        Hello, {user?.displayName || "reader"}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
        This is your dashboard — placeholders until progress and catalog APIs exist. Use the sidebar to explore the
        library and account areas.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Link
          to={libraryBookPath("alice")}
          className="group rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm transition-all hover:border-[#C4B89A] hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF6EC] text-[#C4873A]">
            <i className="ri-book-read-line text-xl" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Continue reading
          </h2>
          <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Open Alice in Wonderland, pick a chapter, and read in the logged-in app reader.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C4873A] group-hover:gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            Open book
            <i className="ri-arrow-right-line" aria-hidden />
          </span>
        </Link>

        <Link
          to="/app/library"
          className="group rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm transition-all hover:border-[#C4B89A] hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F5F0] text-[#7A9E7E]">
            <i className="ri-book-2-line text-xl" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Your library
          </h2>
          <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Browse the curated shelf — sample cards for now; ingestion will populate this later.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C4873A] group-hover:gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            View library
            <i className="ri-arrow-right-line" aria-hidden />
          </span>
        </Link>

        <Link
          to="/app/account"
          className="group rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm transition-all hover:border-[#C4B89A] hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F0FA] text-[#9B7EC8]">
            <i className="ri-user-settings-line text-xl" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Account
          </h2>
          <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {user?.email} · subscription and billing placeholders live here.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#C4873A] group-hover:gap-2" style={{ fontFamily: "'Inter', sans-serif" }}>
            Manage
            <i className="ri-arrow-right-line" aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  );
}
