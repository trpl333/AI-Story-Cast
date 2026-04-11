import { Link } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";

export default function Footer() {
  return (
    <footer className="bg-[#F5F0E8] border-t border-[#E0D8CC]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          {/* Brand */}
          <div className="lg:w-1/3">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src={publicAsset("assets/home/logo.png")}
                alt="AIStoryCast"
                className="h-7 w-7 object-contain"
              />
              <span
                className="text-[#1C1A17] font-bold text-lg tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                AIStoryCast
              </span>
            </div>
            <p
              className="text-[#8B7B6B] text-sm leading-relaxed max-w-xs"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              The audiobook that talks back. An early interactive reading experience for public-domain classics — listen,
              read along with synced text, and pause to discuss what you heard.
            </p>
          </div>

          {/* Links — in-page anchors only; no placeholder social URLs */}
          <div className="flex flex-wrap gap-10 lg:gap-16 flex-1">
            <div>
              <p
                className="text-[#1C1A17] text-xs font-bold uppercase tracking-widest mb-4"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Product
              </p>
              <ul className="space-y-2.5">
                {[
                  { label: "How it Works", to: "/#how-it-works" },
                  { label: "Features", to: "/#features" },
                  { label: "Demo preview", to: "/demo" },
                  { label: "Why Different", to: "/#why-different" },
                  { label: "Early access", to: "/#waitlist" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-[#8B7B6B] text-sm hover:text-[#1C1A17] transition-colors cursor-pointer"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                className="text-[#1C1A17] text-xs font-bold uppercase tracking-widest mb-4"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Legal & contact
              </p>
              <p
                className="text-[#8B7B6B] text-sm leading-relaxed max-w-xs"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Privacy policy, terms, and a public contact channel are still being drafted for launch. Until then, the
                early-access form is the best way to reach the team.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-[#E0D8CC]">
          <p
            className="text-[#A89880] text-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            &copy; 2026 AIStoryCast. All rights reserved.
          </p>
          <Link
            to="/#waitlist"
            className="text-[#A89880] text-xs hover:text-[#5C5346] transition-colors cursor-pointer"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Get Early Access
          </Link>
        </div>
      </div>
    </footer>
  );
}
