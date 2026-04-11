import { Link } from "react-router-dom";
import { publicAsset } from "@/lib/publicAsset";

/** Slim header for auth pages — keeps marketing vs app boundary clear without full marketing nav. */
export default function AuthPageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="border-b border-[#E0D8CC] bg-[#FAF8F4]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-6 md:max-w-none md:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={publicAsset("assets/home/logo.png")} alt="" className="h-8 w-8 object-contain" />
            <span className="font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
              AIStoryCast
            </span>
          </Link>
          <Link to="/demo" className="text-sm text-[#5C5346] hover:text-[#1C1A17]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Try demo
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
