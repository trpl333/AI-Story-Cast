import { useState, useEffect } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-[#FAF8F4]/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 cursor-pointer">
          <img
            src="https://public.readdy.ai/ai/img_res/0ab84d36-9a22-4a00-a214-9638667b9817.png"
            alt="StoryCast Logo"
            className="h-8 w-8 object-contain"
          />
          <span className="text-[#1C1A17] font-bold text-xl tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            StoryCast
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {["How it Works", "Features", "Demo", "Why Different"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-sm text-[#5C5346] hover:text-[#1C1A17] transition-colors duration-200 cursor-pointer whitespace-nowrap"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#demo"
            className="text-sm font-medium text-[#1C1A17] px-4 py-2 rounded-full border border-[#D4C9B8] hover:bg-[#F0EBE3] transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            Try Demo
          </a>
          <a
            href="#waitlist"
            className="text-sm font-medium text-[#FAF8F4] bg-[#2C2416] px-5 py-2 rounded-full hover:bg-[#3D3220] transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            Join Waitlist
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <i className={`text-xl text-[#1C1A17] ${menuOpen ? "ri-close-line" : "ri-menu-3-line"}`}></i>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#FAF8F4]/98 backdrop-blur-md border-t border-[#E8E0D4] px-6 py-5 flex flex-col gap-4">
          {["How it Works", "Features", "Demo", "Why Different"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, "-")}`}
              className="text-sm text-[#5C5346] hover:text-[#1C1A17] transition-colors py-1 cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E0D4]">
            <a href="#demo" className="text-sm font-medium text-center text-[#1C1A17] px-4 py-2.5 rounded-full border border-[#D4C9B8] cursor-pointer whitespace-nowrap">
              Try Demo
            </a>
            <a href="#waitlist" className="text-sm font-medium text-center text-[#FAF8F4] bg-[#2C2416] px-5 py-2.5 rounded-full cursor-pointer whitespace-nowrap">
              Join Waitlist
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
