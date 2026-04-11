import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import DemoShowcase from "./components/DemoShowcase";
import WhyDifferent from "./components/WhyDifferent";
import Waitlist from "./components/Waitlist";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <DemoShowcase />
        <WhyDifferent />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
