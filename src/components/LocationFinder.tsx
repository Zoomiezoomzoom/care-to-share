import React, { useMemo, useState } from 'react';
import MapView from './MapView';

export type Site = {
  slug: string;
  name: string;
  type: 'drop-off' | 'pick-up' | 'both';
  category: string;
  address: string;
  city: string;
  zip: string;
  phone?: string;
  hours?: string;
};

type Props = {
  sites: Site[];
};

export default function LocationFinder({ sites }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'drop-off' | 'pick-up' | 'both'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((s) => {
      const matchesQuery = !q || s.city.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.zip.includes(q);
      const matchesType = filter === 'all' ? true : s.type === filter;
      return matchesQuery && matchesType;
    });
  }, [query, filter, sites]);

  return (
    <section id="finder" className="py-10 md:py-14 bg-[#F6F8FB]">
      <div className="container">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start">
            <div>
              <header className="mb-4">
                <h2 className="text-xl font-semibold text-[#2D5016]">Find Care to Share sites</h2>
                <p className="mt-1 text-sm text-gray-600">Search by city or ZIP and filter by type.</p>
              </header>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#2D5016]">City or ZIP</label>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Jackson or 39201"
                    className="mt-1 w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm focus:border-[#C86D4B] focus:outline-none focus:ring-2 focus:ring-[#C86D4B]/30"
                  />
                </div>

                <fieldset>
                  <legend className="block text-sm font-medium text-[#2D5016]">Type</legend>
                  <div className="mt-2 inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                    {([
                      { key: 'all', label: 'All' },
                      { key: 'drop-off', label: 'Drop Off' },
                      { key: 'pick-up', label: 'Pick Up' },
                      { key: 'both', label: 'Both' },
                    ] as const).map((opt, idx, arr) => {
                      const active = filter === opt.key;
                      const rounded = idx === 0 ? 'rounded-l-lg' : idx === arr.length - 1 ? 'rounded-r-lg' : '';
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setFilter(opt.key)}
                          className={
                            `flex items-center gap-2 px-3 py-2 text-sm ${rounded} ` +
                            (active ? 'bg-[#C86D4B] text-white' : 'bg-white text-gray-700 hover:bg-gray-50')
                          }
                        >
                          {opt.key === 'all' && (
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="8" />
                            </svg>
                          )}
                          {opt.key === 'drop-off' && (
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 7a4 4 0 0 1 8 0" />
                              <rect x="4" y="7" width="16" height="13" rx="2" ry="2" />
                            </svg>
                          )}
                          {opt.key === 'pick-up' && (
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 21s-7-4.5-7-10a7 7 0 1 1 14 0c0 5.5-7 10-7 10z" />
                              <circle cx="12" cy="11" r="3" />
                            </svg>
                          )}
                          {opt.key === 'both' && (
                            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M8 7a4 4 0 0 1 8 0" />
                              <rect x="4" y="7" width="16" height="13" rx="2" ry="2" />
                              <path d="M12 21s-7-4.5-7-10a7 7 0 1 1 14 0c0 5.5-7 10-7 10z" />
                            </svg>
                          )}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="mt-6 md:max-h-[72vh] md:overflow-auto pr-1">
                <div className="grid sm:grid-cols-2 gap-4 md:gap-4">
                  {filtered.map((s) => (
                    <article key={s.slug} className="rounded-xl bg-white p-5 border border-gray-200 hover:border-[#C86D4B]/50 transition-colors shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-[#2D5016] flex-1 min-w-0 pr-2">{s.name}</h3>
                        <span className="flex-none whitespace-nowrap text-xs rounded-full px-3 py-1.5 bg-[#FFF8F0] border border-gray-200 capitalize text-gray-700 leading-none">{s.type.replace('-', ' ')}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div>{s.address}</div>
                        <div>
                          {s.city}, {s.zip}
                        </div>
                        {s.phone && <div className="mt-1">{s.phone}</div>}
                        {s.hours && <div className="mt-1">Hours: {s.hours}</div>}
                      </div>
                    </article>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-sm text-gray-600">No sites match your search.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 md:mt-0 h-72 md:h-[72vh]">
              <MapView markers={filtered} className="h-full w-full rounded-xl border border-gray-200 bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


