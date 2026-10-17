const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=30'
};

function clean(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}
function coordsFrom(value = '') {
  const html = String(value);
  const clip = html.match(/data-clipboard-text=["']([^"']+)["']/i);
  const raw = clip ? clip[1] : html;
  const m = raw.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}
function num(value) {
  const m = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}
function yes(value) { return /^(yes|true|1|available)$/i.test(clean(value)); }
function normalize(row, i) {
  const c = coordsFrom(row.Coords || row.coords || row.Coordinates || '');
  if (!c) return null;
  const name = clean(row.Name || row.name || row.Pokemon || row.pokemon || 'Pokémon desconocido');
  const number = num(row.Number || row.number || row.pokemon_id);
  const atk = num(row.Attack ?? row.attack ?? row.ATK);
  const def = num(row.Defense ?? row.defense ?? row.DEF);
  const sta = num(row.HP ?? row.hp ?? row.Stamina ?? row.stamina);
  return {
    id: String(row.ID || row.id || `${number || name}-${c.lat}-${c.lon}-${i}`),
    name: name.replace(/#\d+\s*$/, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[♂♀]/g, '').replace(/\s+/g, ' ').trim(), number,
    lat: c.lat, lon: c.lon,
    country: clean(row.Country || row.country || row.country_name || ''), countryCode: clean(row.CountryCode || row.country_code || ''), city: clean(row.City || row.city || ''),
    atk, def, sta,
    iv: num(row.IV || row.iv || row['IV%']),
    cp: num(row.CP || row.cp), level: num(row.Level || row.level),
    shinyEligible: yes(row.Shiny || row.shiny || row.shiny_eligible),
    shiny: false,
    start: clean(row['Start Time'] || row.Start || row.start_time || row.start || row.spawn_time || ''),
    expires: clean(row['End Time'] || row.End || row.end_time || row.despawn_time || row.expiration || ''),
    source: 'Moonani PokeList'
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const start = Math.max(0, Math.min(5000, Number(url.searchParams.get('start') || 0)));
  const length = Math.max(10, Math.min(230, Number(url.searchParams.get('length') || 230)));
  const mode = url.searchParams.get('mode') || 'any';
  // Moonani maneja las categorías desde el propio feed; no se simulan filtros en el navegador.
  const iv = mode === 'hundo' ? '100' : '0';
  const pvp = mode === 'pvp' ? '1' : '0';
  const body = new URLSearchParams({ iv, pvp, pokemons: '', start: String(start), length: String(length), draw: '1' });
  try {
    const upstream = await fetch('https://moonani.com/PokeList/ajax.php?page=pokemon&action=load', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://moonani.com/PokeList/index.php',
        'User-Agent': 'PokePau/1.0 (community sightings client)'
      },
      body,
      signal: AbortSignal.timeout(18000)
    });
    if (!upstream.ok) throw new Error(`Proveedor respondió HTTP ${upstream.status}`);
    const payload = await upstream.json();
    const raw = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const sightings = raw.map(normalize).filter(Boolean);
    // Aplicar IV 0% en servidor cuando el feed entregue los IV individuales; para PvP se respeta la categoría del proveedor.
    const filtered = mode === 'nundo' ? sightings.filter(x => x.atk === 0 && x.def === 0 && x.sta === 0) : mode === 'hundo' ? sightings.filter(x => x.atk === 15 && x.def === 15 && x.sta === 15) : sightings;
    return new Response(JSON.stringify({ ok: true, mode, source: 'Moonani PokeList', fetchedAt: new Date().toISOString(), total: filtered.length, start, length, sightings: filtered }), { headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, source: 'Moonani PokeList', error: 'No se pudo consultar el feed de apariciones. El proveedor puede estar temporalmente caído o limitar las solicitudes.', detail: String(error?.message || error), sightings: [] }), { status: 502, headers: cors });
  }
}
