import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";
import { useAuth } from "@/auth/useAuth";

const navLinks = [
  { label: "How it Works", to: "/#how-it-works" },
  { label: "Features", to: "/#features" },
  { label: "Demo preview", to: "/demo" },
  { label: "Why Different", to: "/#why-different" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#FAF8F4]/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-16 md:h-20 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 cursor-pointer shrink-0">
          <img
            src={publicAsset("assets/home/logo.png")}
            alt="AIStoryCast"
            className="h-8 w-8 object-contain"
          />
          <span className="text-[#1C1A17] font-bold text-xl tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            AIStoryCast
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-8 min-w-0">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-[#5C5346] hover:text-[#1C1A17] transition-colors duration-200 cursor-pointer whitespace-nowrap"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {item.label}
            </Link>
          ))}
          <div className="h-4 w-px shrink-0 bg-[#D4C9B8]" aria-hidden />
          {isAuthenticated ? (
            <>
              <Link
                to="/app"
                className="text-sm font-medium text-[#1C1A17] hover:text-[#C4873A] transition-colors whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                App
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium text-[#5C5346] hover:text-[#1C1A17] transition-colors whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-[#5C5346] hover:text-[#1C1A17] transition-colors whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm font-medium text-[#C4873A] hover:text-[#A66B2E] transition-colors whitespace-nowrap"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <Link
            to="/demo"
            className="text-sm font-medium text-[#1C1A17] px-4 py-2 rounded-full border border-[#D4C9B8] hover:bg-[#F0EBE3] transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            Preview the Experience
          </Link>
          <Link
            to="/#waitlist"
            className="text-sm font-medium text-[#FAF8F4] bg-[#2C2416] px-5 py-2 rounded-full hover:bg-[#3D3220] transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            Get Early Access
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center cursor-pointer shrink-0"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <i className={`text-xl text-[#1C1A17] ${menuOpen ? "ri-close-line" : "ri-menu-3-line"}`}></i>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#FAF8F4]/98 backdrop-blur-md border-t border-[#E8E0D4] px-6 py-5 flex flex-col gap-4">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-[#5C5346] hover:text-[#1C1A17] transition-colors py-1 cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#E8E0D4] pt-3">
            {isAuthenticated ? (
              <>
                <Link to="/app" className="text-sm font-medium text-[#1C1A17]" onClick={() => setMenuOpen(false)}>
                  App
                </Link>
                <button type="button" onClick={handleSignOut} className="text-sm font-medium text-[#5C5346]">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-[#5C5346]" onClick={() => setMenuOpen(false)}>
                  Log in
                </Link>
                <Link to="/signup" className="text-sm font-medium text-[#C4873A]" onClick={() => setMenuOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E0D4]">
            <Link to="/demo" className="text-sm font-medium text-center text-[#1C1A17] px-4 py-2.5 rounded-full border border-[#D4C9B8] cursor-pointer whitespace-nowrap" onClick={() => setMenuOpen(false)}>
              Preview the Experience
            </Link>
            <Link to="/#waitlist" className="text-sm font-medium text-center text-[#FAF8F4] bg-[#2C2416] px-5 py-2.5 rounded-full cursor-pointer whitespace-nowrap" onClick={() => setMenuOpen(false)}>
              Get Early Access
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
