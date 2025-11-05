import React, { useEffect, useState } from 'react';

type Props = {
  goal?: number;
  className?: string;
  variant?: 'default' | 'hero';
};

export default function PartnerProgress({ goal = 100, className, variant = 'hero' }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCount(Array.isArray(data) ? data.length : 0);
    } catch (e) {
      // keep last count if any
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000); // refresh every minute
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.round(((count ?? 0) / goal) * 100));

  const sectionClasses = variant === 'hero'
    ? `pt-2 mb-12 ${className ?? ''}`
    : `mb-12 ${className ?? ''}`;

  const cardClasses = variant === 'hero'
    ? 'rounded-xl bg-white/90 backdrop-blur ring-1 ring-[rgb(0_0_0/0.06)] shadow-sm p-4 md:p-5'
    : 'rounded-2xl border border-gray-200 bg-white shadow-sm p-5 md:p-6';

  const titleClasses = variant === 'hero'
    ? 'text-base md:text-lg font-semibold text-[#2D5016]'
    : 'text-xl font-semibold text-[#2D5016]';

  const barHeight = variant === 'hero' ? 'h-2.5' : 'h-3';

  return (
    <section className={sectionClasses}>
      <div className="container max-w-4xl mx-auto">
        <div className={cardClasses}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className={titleClasses}>Businesses Signed Up</h2>
              <p className="text-xs md:text-sm text-gray-600">Goal: {goal} sites</p>
            </div>
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-[#2D5016]">
                {loading ? '…' : count ?? 0} <span className="text-xs md:text-sm font-medium text-gray-500">/ {goal}</span>
              </div>
            </div>
          </div>
          <div className={`mt-3 ${barHeight} rounded-full bg-gray-100 ring-1 ring-[rgb(0_0_0/0.06)] overflow-hidden`}>
            <div
              className="h-full rounded-full bg-[#C86D4B] transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] md:text-xs text-gray-600">
            {pct}% toward our goal <span role="img" aria-label="Celebration">🎉</span>
          </div>
        </div>
        <div className="h-7 md:h-12" /> {/* Extra space underneath */}
      </div>
    </section>
  );
}
