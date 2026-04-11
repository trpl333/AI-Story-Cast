export default function Footer() {
  return (
    <footer className="bg-[#F5F0E8] border-t border-[#E0D8CC]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          {/* Brand */}
          <div className="lg:w-1/3">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="https://public.readdy.ai/ai/img_res/0ab84d36-9a22-4a00-a214-9638667b9817.png"
                alt="StoryCast Logo"
                className="h-7 w-7 object-contain"
              />
              <span
                className="text-[#1C1A17] font-bold text-lg tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                StoryCast
              </span>
            </div>
            <p
              className="text-[#8B7B6B] text-sm leading-relaxed max-w-xs"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              The audiobook that talks back. Listen, read, and discuss classic books with AI-powered narration and character voices.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[
                { icon: "ri-twitter-x-line", href: "#" },
                { icon: "ri-instagram-line", href: "#" },
                { icon: "ri-linkedin-box-line", href: "#" },
              ].map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#E8E0D4] text-[#5C5346] hover:bg-[#D4C9B8] hover:text-[#1C1A17] transition-colors cursor-pointer"
                >
                  <i className={`${s.icon} text-sm`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-10 lg:gap-16 flex-1">
            {[
              {
                title: "Product",
                links: ["About", "Demo", "Features", "How it Works"],
              },
              {
                title: "Company",
                links: ["Blog", "Careers", "Press", "Contact"],
              },
              {
                title: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
              },
            ].map((col) => (
              <div key={col.title}>
                <p
                  className="text-[#1C1A17] text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[#8B7B6B] text-sm hover:text-[#1C1A17] transition-colors cursor-pointer"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-[#E0D8CC]">
          <p
            className="text-[#A89880] text-xs"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            &copy; 2026 StoryCast. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {["Privacy", "Terms", "Contact"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-[#A89880] text-xs hover:text-[#5C5346] transition-colors cursor-pointer"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
