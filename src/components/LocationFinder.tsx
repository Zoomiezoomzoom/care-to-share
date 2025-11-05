import React, { useEffect, useMemo, useState } from 'react';
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
  lat?: number;
  lng?: number;
};

type Props = {
  sites?: Site[];
  cityFilter?: string;
};

// Brand colors
const TERRA_COTTA = "#C86D4B";
const TERRA_COTTA_DARK = "#B55D3B";
const FOREST_GREEN = "#2D5016";
const FOREST_GREEN_DARK = "#1F3810";
const CREAM = "#FFF8F0";

export default function LocationFinder({ sites: initial, cityFilter }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'drop-off' | 'pick-up' | 'both'>('all');
  const [sites, setSites] = useState<Site[]>(initial ?? []);
  const [loading, setLoading] = useState<boolean>(!initial);
  const [active, setActive] = useState<Site | null>(null);
  const [showMapMobile, setShowMapMobile] = useState(false);
  const [fullMap, setFullMap] = useState(false);
  const [showListScrollHint, setShowListScrollHint] = useState(false);

  // Pick up filter from URL (?type=drop-off|pick-up|both)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('type');
      if (t === 'drop-off' || t === 'pick-up' || t === 'both') {
        setFilter(t);
        // optionally clean the param so it doesn't persist if user navigates
        params.delete('type');
        const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', url);
      }

      // If user navigated to #finder, ensure we scroll to the top of the section (header visible)
      // If #finder-filters was used, keep that behavior and scroll to filters
      if (window.location.hash === '#finder') {
        setTimeout(() => {
          const top = document.getElementById('finder');
          if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      } else if (window.location.hash === '#finder-filters') {
        setTimeout(() => {
          const filters = document.getElementById('finder-filters');
          if (filters) filters.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let ignore = false;
    if (initial && initial.length > 0) {
      setSites(initial);
      setLoading(false);
      return;
    }
    async function load() {
      try {
        setLoading(true);
        const qs = cityFilter ? `?city=${encodeURIComponent(cityFilter)}` : '';
        const res = await fetch(`/api/sites${qs}`);
        if (!res.ok) throw new Error('Failed to load sites');
        const data = await res.json();
        if (!ignore) setSites(data);
      } catch (e) {
        console.error(e);
        if (!ignore) setSites([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [initial, cityFilter]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(id);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return sites.filter((s) => {
      const matchesQuery = !q || s.city.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.zip.includes(q);
      const matchesType = (() => {
        if (filter === 'all') return true;
        if (filter === 'drop-off') return s.type === 'drop-off' || s.type === 'both';
        if (filter === 'pick-up') return s.type === 'pick-up' || s.type === 'both';
        if (filter === 'both') return s.type === 'both';
        return true;
      })();
      return matchesQuery && matchesType;
    });
  }, [debouncedQuery, filter, sites]);

  useEffect(() => {
    const el = document.getElementById('resultsList');
    if (!el) return;
    const update = () => {
      try {
        const canScroll = el.scrollHeight > el.clientHeight + 2;
        const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 2;
        setShowListScrollHint(canScroll && !atBottom);
      } catch {}
    };
    update();
    el.addEventListener('scroll', update, { passive: true } as any);
    window.addEventListener('resize', update);
    const ro = (window as any).ResizeObserver ? new (window as any).ResizeObserver(update) : null;
    try { ro && ro.observe(el); } catch {}
    return () => {
      try { el.removeEventListener('scroll', update as any); } catch {}
      try { window.removeEventListener('resize', update); } catch {}
      try { ro && ro.disconnect(); } catch {}
    };
  }, [filtered.length, showMapMobile, fullMap]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section Header */}
      <header className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-[#2D5016] mb-2">
        Find a Food Site Near You
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore the food sites listed below—no sign up required. Visit any site to pick up or drop off food.
        </p>
      </header>
      {/* Finder Container */}
      <div className="rounded-2xl bg-white border-2 border-gray-100 shadow-sm p-4 md:p-6">
        {/* Search & Filter Bar */}
        <div id="finder-filters" className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by city, ZIP, or business name"
                className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#C86D4B] focus:ring-2 focus:ring-[#C86D4B]/20 transition-colors"
                aria-label="Search sites by city, ZIP, or business name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const first = document.querySelector('#resultsList [data-card]') as HTMLElement | null;
                    if (first) {
                      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      first.focus();
                    }
                  }
                }}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  ×
                </button>
              )}
            </div>

            {/* Type Filter Buttons */}
            <div className="flex gap-2 overflow-x-auto md:overflow-visible -mx-1 px-1">
              {([
                { key: 'all', label: 'All Sites' },
                { key: 'drop-off', label: 'Drop Off' },
                { key: 'pick-up', label: 'Pick Up' },
                { key: 'both', label: 'Both' },
              ] as const).map((opt) => {
                const activeBtn = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    aria-pressed={activeBtn}
                    className={`shrink-0 px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-all whitespace-nowrap ${
                      activeBtn
                        ? 'bg-[#C86D4B] text-white border-[#C86D4B] shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#C86D4B] hover:text-[#C86D4B]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Locate Me */}
            <button
              onClick={() => {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition((pos) => {
                  const { latitude, longitude } = pos.coords;
                  setActive({
                    slug: 'me',
                    name: 'Current location',
                    type: 'both',
                    category: 'me',
                    address: '',
                    city: '',
                    zip: '',
                    lat: latitude,
                    lng: longitude,
                  });
                  setShowMapMobile(true);
                  try {
                    document.getElementById('finder-filters')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  } catch {}
                });
              }}
              className="px-6 py-2.5 bg-[#2D5016] text-white font-semibold rounded-lg hover:bg-[#1F3810] transition-colors whitespace-nowrap shadow-sm"
            >
              📍 Near Me
            </button>
          </div>

          {/* Active Filters */}
          {filter !== 'all' && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-gray-500">Active filters:</span>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#C86D4B]/10 text-[#C86D4B] rounded-full hover:bg-[#C86D4B]/20 transition-colors font-medium"
                aria-label="Clear type filter"
              >
                {filter.replace('-', ' ')}
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600" aria-live="polite">
            Showing{' '}
            <strong className="text-[#2D5016] font-bold">
              {filtered.length} site{filtered.length === 1 ? '' : 's'}
            </strong>
            {cityFilter && <span className="ml-1">in {cityFilter}</span>}
          </p>
          {(query || filter !== 'all') && (
            <button
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="text-sm text-[#C86D4B] hover:text-[#B55D3B] font-medium hover:underline transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Mobile map toggle */}
        <div className="md:hidden mb-6">
          <button
            type="button"
            onClick={() => setShowMapMobile((v) => !v)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold hover:border-[#C86D4B] hover:text-[#C86D4B] transition-colors"
            aria-expanded={showMapMobile}
            aria-controls="map-area"
          >
            {showMapMobile ? 'Hide Map' : 'Show Map'}
          </button>
        </div>

        {/* Split View: List + Map */}
        <div id="map-area" className={`grid ${fullMap ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
          {/* Left: Results List */}
          <div className={`${showMapMobile ? 'hidden md:block' : 'block'} ${fullMap ? 'hidden md:hidden' : 'md:col-span-2'} relative`}>
            <div
              id="resultsList"
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-2 md:pr-4 ${showMapMobile ? 'hidden md:grid' : 'grid'}`}
            >
              {filtered.map((s) => (
                <div
                  key={s.slug}
                  className="site-card bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border-2 border-transparent cursor-pointer focus:outline-none focus:ring-2 h-full flex flex-col"
                  data-card
                  tabIndex={0}
                  style={{
                    borderColor: "transparent"
                  }}
                  onMouseOver={e => {
                    (e.currentTarget.style.borderColor = TERRA_COTTA);
                  }}
                  onMouseOut={e => {
                    (e.currentTarget.style.borderColor = "transparent");
                  }}
                  onFocus={e => {
                    (e.currentTarget.style.boxShadow = `0 0 0 3px ${TERRA_COTTA}33`);
                  }}
                  onBlur={e => {
                    (e.currentTarget.style.boxShadow = "");
                  }}
                  onClick={() => {
                    setActive(s);
                    setShowMapMobile(true);
                    try { document.getElementById('map-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActive(s);
                      setShowMapMobile(true);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className="text-xl font-bold text-[#2D5016] transition-colors"
                      style={{}}
                      onMouseOver={e => { e.currentTarget.style.color = TERRA_COTTA; }}
                      onMouseOut={e => { e.currentTarget.style.color = "#2D5016"; }}
                    >
                      {s.name}
                    </h3>
                    <span
                      className="px-3 py-1 text-white text-xs font-semibold rounded-full"
                      style={{ backgroundColor: TERRA_COTTA }}
                    >
                      {s.type.toUpperCase().replace('-', ' ')}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="space-y-2 text-gray-600 text-sm">
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span>{s.address}{s.city ? `, ${s.city}` : ''}{s.zip ? ` ${s.zip}` : ''}</span>
                      </p>
                      {s.phone && (
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                          </svg>
                          <a href={`tel:${s.phone.replace(/[^\\d]/g, '')}`}
                            className="transition-colors"
                            style={{ color: TERRA_COTTA, textDecoration: "none" }}
                            onMouseOver={e => { e.currentTarget.style.textDecoration = "underline"; }}
                            onMouseOut={e => { e.currentTarget.style.textDecoration = "none"; }}
                          >
                            {s.phone}
                          </a>
                        </p>
                      )}
                      {s.hours && (
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <span>{s.hours}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3 items-stretch">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address} ${s.city} ${s.zip}`)}`}
                      target="_blank"
                      className="flex-1 text-center rounded-lg font-semibold transition-colors"
                      style={{
                        backgroundColor: TERRA_COTTA,
                        color: "#fff",
                        padding: "0.5rem 1rem"
                      }}
                      onMouseOver={e => { e.currentTarget.style.backgroundColor = TERRA_COTTA_DARK; }}
                      onMouseOut={e => { e.currentTarget.style.backgroundColor = TERRA_COTTA; }}
                    >
                      Get Directions →
                    </a>
                    <a
                      href={`/site/${s.slug}`}
                      className="px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                      style={{}}
                      onMouseOver={e => {
                        e.currentTarget.style.borderColor = TERRA_COTTA;
                        e.currentTarget.style.color = TERRA_COTTA;
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.borderColor = "#E5E7EB";
                        e.currentTarget.style.color = "#374151";
                      }}
                    >
                      Details
                    </a>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && !loading && (
                <div className="text-center py-16 md:col-span-2">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">No sites found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                  <button
                    onClick={() => { setQuery(''); setFilter('all'); }}
                    className="px-6 py-3 text-white font-semibold rounded-lg"
                    style={{
                      backgroundColor: TERRA_COTTA
                    }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = TERRA_COTTA_DARK; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = TERRA_COTTA; }}
                  >Show All Sites</button>
                </div>
              )}
              {loading && (
                <p className="text-sm text-gray-600 md:col-span-2">Loading sites…</p>
              )}
            </div>

            {/* bottom fade + scroll-more button */}
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent transition-opacity ${showListScrollHint ? 'opacity-100' : 'opacity-0'}`}></div>
            <button
              type="button"
              aria-label="Scroll for more locations"
              onClick={() => {
                const el = document.getElementById('resultsList');
                if (!el) return;
                el.scrollBy({ top: Math.max(200, el.clientHeight * 0.9), behavior: 'smooth' });
              }}
              className={`pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium shadow-sm hover:bg-gray-50 transition-opacity ${showListScrollHint ? 'opacity-100' : 'opacity-0'}`}
            >
              More locations
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          {/* Right: Map + Legend */}
          <div className={`${showMapMobile ? 'block' : 'hidden'} md:block ${fullMap ? '' : 'md:sticky md:top-24 md:col-span-1'}`}>
            <div className="relative">
              <button
                type="button"
                onClick={() => { const next = !fullMap; setFullMap(next); if (next) setShowMapMobile(true); }}
                className="absolute top-3 right-3 z-10 hidden md:inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold border border-gray-200 shadow-sm hover:bg-white"
              >
                {fullMap ? 'Exit map' : 'Full map'}
              </button>
              <div className="w-full h-72 sm:h-96 md:h-[60vh] lg:h-[80vh] rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <MapView markers={filtered} active={active ?? undefined} className="h-full w-full" />
              </div>
            </div>
            <div className={`mt-4 flex justify-center gap-6 text-sm text-gray-600 ${fullMap ? 'hidden md:flex' : ''}`}>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Both</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Drop Off</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Pick Up</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 bg-gradient-to-br from-[#FFF8F0] to-[#FFE8D6] rounded-2xl p-8 md:p-10 text-center border-2 border-[#C86D4B]/20 shadow-sm">
        <h3 className="text-2xl md:text-3xl font-bold text-[#2D5016] mb-3">
          Don't see your business listed?
        </h3>
        <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
          Help us reach 100 sites across Mississippi. Register your business as a collection site today.
        </p>
        <a
          href="/become-a-partner"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#C86D4B] text-white text-lg font-bold rounded-lg hover:bg-[#B55D3B] transition-all shadow-md hover:shadow-lg"
        >
          Register Your Business →
        </a>
      </div>
    </section>
  );
}

