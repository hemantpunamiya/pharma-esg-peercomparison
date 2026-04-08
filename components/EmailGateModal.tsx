"use client";

import { useState, useEffect } from "react";

const FORMSPARK_URL = "https://submit-form.com/j6uvttw24dn";

export default function EmailGateModal({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const captured = localStorage.getItem("esg_email_captured");
      if (captured) onUnlock();
    }
  }, [onUnlock]);

  // Block Escape key and any click outside — modal CANNOT be dismissed
  useEffect(() => {
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", blockEscape);
    // Prevent scrolling on background
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", blockEscape);
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    // Validate email properly
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid work email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await fetch(FORMSPARK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: trimmed }),
      });
    } catch {
      // Network error — still unlock, Formspark may have received it
    } finally {
      localStorage.setItem("esg_email_captured", "true");
      setLoading(false);
      onUnlock();
    }
  };

  return (
    /* overflow-y-auto so modal stays visible when the mobile keyboard pushes the viewport up */
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />

      {/* items-start on mobile so keyboard doesn't push modal off-screen; items-center on larger screens */}
      <div className="relative flex min-h-full items-start justify-center px-4 py-12 sm:items-center sm:py-8">
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        {/* Accent bar */}
        <div className="absolute left-0 top-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-[#1b2a4a] via-[#4a90d9] to-[#1b2a4a]" />

        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#4a90d9]">
          The ESG Dispatch by AccelentPartners
        </div>

        <h2 className="mb-3 text-2xl font-bold text-[#1b2a4a]">
          Get Instant Access
        </h2>

        <p className="mb-1 text-base text-slate-600">
          India&apos;s most comprehensive pharma ESG benchmarking dashboard.
        </p>
        <p className="mb-2 text-sm text-slate-500">
          56 companies &middot; 501 data points &middot; 8-sheet Excel download
        </p>
        <p className="mb-6 text-sm text-slate-500">
          Also get our weekly{" "}
          <span className="font-semibold text-[#1b2a4a]">ESG Dispatch</span>{" "}
          — curated ESG insights for Indian businesses, straight to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="Your work email"
              required
              autoComplete="email"
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#4a90d9] focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/30"
            />
            {error && (
              <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#1b2a4a] px-6 py-3.5 text-base font-semibold text-white transition-all hover:bg-[#2c3e6b] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Unlocking...
              </span>
            ) : (
              "Get Free Access + Subscribe to ESG Dispatch"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          No spam, ever. Unsubscribe in one click. We respect your inbox.
        </p>
      </div>
      </div>
    </div>
  );
}
