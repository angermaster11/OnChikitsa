'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X, Navigation, MapPin } from '../_components/icons';
import { flow } from '../_lib/flow';
import styles from './location.module.css';

const PLACES = [
  { id: 'p1', title: 'New Delhi', sub: 'Delhi, India', city: 'Delhi' },
  { id: 'p2', title: 'New Delhi Railway Station', sub: 'Paharganj, New Delhi, Delhi', city: 'Delhi' },
  { id: 'p3', title: 'Noida Sector 18', sub: 'Noida, Uttar Pradesh', city: 'Noida' },
  { id: 'p4', title: 'Cyber Hub', sub: 'DLF Cyber City, Gurugram, Haryana', city: 'Gurugram' },
  { id: 'p5', title: 'MG Road', sub: 'Gurugram, Haryana', city: 'Gurugram' },
  { id: 'p6', title: 'Connaught Place', sub: 'New Delhi, Delhi', city: 'Delhi' },
  { id: 'p7', title: 'Sector 62', sub: 'Noida, Uttar Pradesh', city: 'Noida' },
  { id: 'p8', title: 'Golf Course Road', sub: 'Gurugram, Haryana', city: 'Gurugram' },
  { id: 'p9', title: 'Saket', sub: 'South Delhi, Delhi', city: 'Delhi' },
  { id: 'p10', title: 'Indirapuram', sub: 'Ghaziabad, Uttar Pradesh', city: 'Ghaziabad' },
];

function Highlight({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className={styles.mark}>{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

// Best-effort device coordinates. Native goes through the Capacitor Geolocation
// plugin (reliable runtime permission prompt + fix); the browser falls back to
// the Web Geolocation API. Resolves to plain {lat,lng} numbers or null — never a
// Capacitor plugin proxy.
async function getCoords() {
  try {
    const { isNative } = await import('../_lib/auth');
    if (await isNative()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      try { await Geolocation.requestPermissions(); } catch { /* prompt denied → still try */ }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch { /* fall through to the web path */ }
  return new Promise((resolve) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation?.getCurrentPosition) {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 10000, maximumAge: 60000 },
        );
        return;
      }
    } catch { /* ignore */ }
    resolve(null);
  });
}

// Turn coordinates into a human "Area, Region" label + a structured city via a
// free, keyless, CORS-enabled client geocoder. Returns `{ label, city }` (either
// may be null) so the caller can both show a label and drive the city filter.
async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!res.ok) return { label: null, city: null };
    const d = await res.json();
    const area = d.locality || d.city || d.principalSubdivision;
    const region = d.principalSubdivision;
    const label = area && region && area !== region ? `${area}, ${region}` : (area || region || null);
    return { label, city: d.city || d.locality || null };
  } catch { return { label: null, city: null }; }
}

// Live place search (forward geocode / autocomplete) via Photon — free, keyless,
// CORS-enabled, OSM-backed. Maps each hit to {id,title,sub}. Returns null on any
// failure so the caller can fall back to the built-in list.
async function searchPlaces(query) {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feats = Array.isArray(data.features) ? data.features : [];
    return feats.map((f, i) => {
      const p = f.properties || {};
      const title = p.name || p.street || p.city || p.state || p.country || 'Unknown';
      const sub = [...new Set([p.street, p.district, p.city, p.county, p.state, p.country])]
        .filter((x) => x && x !== title)
        .join(', ');
      return { id: `ph-${p.osm_id || i}-${i}`, title, sub, city: p.city || p.county || p.state || '' };
    });
  } catch { return null; }
}

export default function LocationPicker() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Debounced search: live results from Photon, with the built-in PLACES list as
  // an instant offline fallback when the network call fails or returns nothing.
  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setSearching(false); return; }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const live = await searchPlaces(term);
      if (cancelled) return;
      if (live && live.length) {
        setResults(live);
      } else {
        const lc = term.toLowerCase();
        setResults(PLACES.filter((p) => `${p.title} ${p.sub}`.toLowerCase().includes(lc)));
      }
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  // Persist the chosen location LABEL + its structured city, then return to the
  // dashboard. City drives the clinic filter (backend `?city=`); we prefer the
  // structured city, fall back to the label's first comma-segment, and clear it
  // for the generic "Current location" so an unknown place never dead-ends the
  // list. Stored city stays short (e.g. "Delhi") so the contains-match is broad.
  const choose = (label, city) => {
    flow.setLocation(label);
    const derived = (city || '').trim() || (label || '').split(',')[0].trim();
    flow.setCity(label === 'Current location' ? '' : derived);
    router.back();
  };

  // "Current location" → get a real device fix, resolve it to a place name, and
  // show it in the header. Shows a "Locating…" busy state so the tap is never a
  // dead button; on any failure it still returns with the generic label.
  const useHere = async () => {
    if (locating) return;
    setLocating(true);
    const coords = await getCoords();
    if (!coords) { setLocating(false); choose('Current location'); return; }
    const { label, city } = await reverseGeocode(coords);
    setLocating(false);
    choose(label || 'Current location', city || '');
  };

  return (
    <main className={styles.screen}>
      <div className={styles.head}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>Location</h1>
      </div>

      <div className={styles.searchWrap}>
        <div className={styles.search} role="search">
          <Search size={20} className={styles.mag} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for area, street name..."
            aria-label="Search location"
            autoFocus
          />
          {query && (
            <button className={styles.clear} onClick={() => setQuery('')} aria-label="Clear">
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      {query ? (
        results.length ? (
          <ul className={styles.results}>
            {results.map((p) => (
              <li key={p.id}>
                <button className={styles.result} onClick={() => choose(p.title, p.city)}>
                  <span className={styles.rIcon}><MapPin size={20} /></span>
                  <span className={styles.rBody}>
                    <span className={styles.rTitle}><Highlight text={p.title} query={query} /></span>
                    <span className={styles.rSub}><Highlight text={p.sub} query={query} /></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : searching ? (
          <p className={styles.empty}>Searching…</p>
        ) : (
          <p className={styles.empty}>No results for “{query}”</p>
        )
      ) : (
        <>
          <button className={styles.current} onClick={useHere} disabled={locating}>
            <span className={styles.curIcon}><Navigation size={20} fill="currentColor" /></span>
            {locating ? 'Locating…' : 'Current location'}
          </button>
        </>
      )}
    </main>
  );
}
