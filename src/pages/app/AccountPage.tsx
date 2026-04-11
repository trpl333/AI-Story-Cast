import { useAuth } from "@/auth/useAuth";

export default function AccountPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8B7B6B]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Account
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#1C1A17]" style={{ fontFamily: "'Playfair Display', serif" }}>
        Profile & subscription
      </h1>
      <p className="mt-3 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
        Billing and Stripe Customer Portal will connect here. For now this page only reflects your mock session.
      </p>

      <div className="mt-10 space-y-6">
        <section className="rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1C1A17]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Profile
          </h2>
          <dl className="mt-4 space-y-3 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex justify-between gap-4 border-b border-[#F0EBE3] pb-3">
              <dt className="text-[#8B7B6B]">Display name</dt>
              <dd className="font-medium text-[#1C1A17]">{user?.displayName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8B7B6B]">Email</dt>
              <dd className="font-medium text-[#1C1A17]">{user?.email}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-dashed border-[#C4B89A] bg-[#FDF6EC]/50 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1C1A17]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Subscription
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            No plan attached yet. When Stripe is wired, you&apos;ll see your tier, renewal date, and a button to open
            the billing portal.
          </p>
          <button
            type="button"
            disabled
            className="mt-4 rounded-xl border border-[#E0D8CC] bg-white px-4 py-2.5 text-sm font-medium text-[#8B7B6B]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Manage billing (soon)
          </button>
        </section>

        <section className="rounded-2xl border border-[#E0D8CC] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1C1A17]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Session
          </h2>
          <p className="mt-2 text-sm text-[#5C5346]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Sign out clears the mock session in this browser (localStorage).
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 rounded-xl bg-[#2C2416] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#3D3220]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
