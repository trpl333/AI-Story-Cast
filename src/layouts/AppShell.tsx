import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";
import { useAuth } from "@/auth/useAuth";
import { libraryBookPath } from "@/data/libraryBooks";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-[#C4873A]/20 text-[#E8D9C0]" : "text-[#8B7B6B] hover:bg-[#2C2416] hover:text-[#C4B89A]"
  }`;

export default function AppShell() {
  const { user, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileNavOpen(false);
  };

  const NavItems = (
    <>
      <NavLink to="/app" end className={navClass} onClick={() => setMobileNavOpen(false)} style={{ fontFamily: "'Inter', sans-serif" }}>
        <i className="ri-dashboard-3-line text-lg" aria-hidden />
        Home
      </NavLink>
      <NavLink to="/app/library" className={navClass} onClick={() => setMobileNavOpen(false)} style={{ fontFamily: "'Inter', sans-serif" }}>
        <i className="ri-book-open-line text-lg" aria-hidden />
        Library
      </NavLink>
      <NavLink to="/app/discover" className={navClass} onClick={() => setMobileNavOpen(false)} style={{ fontFamily: "'Inter', sans-serif" }}>
        <i className="ri-compass-3-line text-lg" aria-hidden />
        Discover
      </NavLink>
      <NavLink to="/app/upload" className={navClass} onClick={() => setMobileNavOpen(false)} style={{ fontFamily: "'Inter', sans-serif" }}>
        <i className="ri-upload-cloud-2-line text-lg" aria-hidden />
        Upload
      </NavLink>
      <NavLink to={libraryBookPath("alice")} className={navClass} onClick={() => setMobileNavOpen(false)} style={{ fontFamily: "'Inter', sans-serif" }}>
        <i className="ri-book-read-line text-lg" aria-hidden />
        Reader
      </NavLink>
      <Link
        to="/demo"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8B7B6B] transition-colors hover:bg-[#2C2416] hover:text-[#C4B89A]"
        onClick={() => setMobileNavOpen(false)}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <i className="ri-play-circle-line text-lg" aria-hidden />
        Demo reader
      </Link>
      <NavLink to="/app/account" className={navClass} onClick={() => setMobileNavOpen(false)} style={{ fontFamily: "'Inter', sans-serif" }}>
        <i className="ri-user-settings-line text-lg" aria-hidden />
        Account
      </NavLink>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#FAF8F4]">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[#3D3220] bg-[#1C1A17] md:flex">
        <Link to="/app" className="flex items-center gap-2 border-b border-[#3D3220] px-5 py-5">
          <img src={publicAsset("assets/home/logo.png")} alt="" className="h-8 w-8 object-contain" />
          <span className="font-bold text-[#E8D9C0]" style={{ fontFamily: "'Playfair Display', serif" }}>
            AIStoryCast
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 p-3">{NavItems}</nav>
        <div className="border-t border-[#3D3220] p-4">
          <p className="truncate text-xs text-[#6B6355]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {user?.email}
          </p>
          <Link
            to="/"
            className="mt-2 block text-xs text-[#8B7B6B] hover:text-[#C4B89A]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            ← Marketing site
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-lg border border-[#3D3220] py-2 text-xs font-medium text-[#C4B89A] hover:bg-[#2C2416]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#E0D8CC] bg-[#FAF8F4]/95 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E0D8CC] text-[#1C1A17]"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <i className={`${mobileNavOpen ? "ri-close-line" : "ri-menu-3-line"} text-xl`} />
          </button>
          <Link to="/app" className="flex items-center gap-2">
            <img src={publicAsset("assets/home/logo.png")} alt="" className="h-7 w-7 object-contain" />
            <span className="font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
              AIStoryCast
            </span>
          </Link>
          <span className="w-10" aria-hidden />
        </header>

        {mobileNavOpen && (
          <div className="border-b border-[#E0D8CC] bg-[#1C1A17] px-3 py-4 md:hidden">
            <nav className="flex flex-col gap-1">{NavItems}</nav>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 w-full rounded-lg bg-[#C4873A] py-2.5 text-sm font-semibold text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Sign out
            </button>
          </div>
        )}

        <main className="flex-1 px-5 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
