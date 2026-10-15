/* Pokédex Versus — compare up to four Pokémon. Vanilla JS, data from data/dex.json (built from PokéAPI). */
(() => {
"use strict";

const MAX = 4;
const SPRITE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
const ART = id => `${SPRITE}other/official-artwork/${id}.png`;
const PIX = id => `${SPRITE}${id}.png`;
const STAT_NAMES = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];
const STAT_SHORT = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
const VERSION = ["Red", "Blue", "Yellow", "Green"];
const TYPE_COLORS = {
  normal: "#9a9a78", fighting: "#c03028", flying: "#8f7de0", poison: "#a040a0", ground: "#c9a64e", rock: "#a8913a",
  bug: "#8fa020", ghost: "#705898", steel: "#8a8aa8", fire: "#e5671f", water: "#4f7fe8", grass: "#5da83a",
  electric: "#e0b000", psychic: "#ef4f7f", ice: "#5fc0c0", dragon: "#6038f0", dark: "#705848", fairy: "#e07aa8"
};
const REGION_GEN = ["", "Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

// Hand-picked trivia (the rest of the facts are computed from the data).
const TRIVIA = {
  1: "Bulbasaur is #001 in the National Pokédex, but Rhydon was the first Pokémon ever designed.",
  112: "Rhydon was the first Pokémon Game Freak ever designed.",
  6: "Charizard has two Mega Evolutions (X and Y) and a Gigantamax form.",
  25: "Its name blends the Japanese sounds “pika” (a sparkle) and “chu” (a mouse's squeak).",
  94: "Pokédex lore says Gengar may be the shadow of a Clefable.",
  129: "Its signature move Splash does absolutely nothing.",
  130: "Gyarados is the reward for raising a Magikarp, the weakest Pokémon around.",
  132: "Ditto can breed with almost any Pokémon outside the Undiscovered egg group, but not with another Ditto.",
  133: "Eevee has eight evolutions, more than any other Pokémon.",
  143: "Snorlax blocked Routes 12 and 16 in Red & Green until you woke it with the Poké Flute.",
  150: "Mewtwo was created by gene-splicing Mew's DNA, and has two Mega Evolutions.",
  151: "Mew was slipped into the original games at the last minute by programmer Shigeki Morimoto.",
  201: "Unown comes in 28 forms: the letters A to Z plus ! and ?.",
  235: "Smeargle can learn almost any move in the game using Sketch.",
  292: "Shedinja always has exactly 1 HP; its Wonder Guard only lets super-effective hits land.",
  350: "In Ruby & Sapphire, its pre-evolution Feebas lived on only six random water tiles of Route 119.",
  384: "Rayquaza is the only Pokémon that Mega Evolves without a Mega Stone, using Dragon Ascent instead.",
  448: "Lucario can sense aura, the energy given off by every living thing.",
  487: "Giratina switches between Altered and Origin Forme depending on the item it holds or the world it is in.",
  493: "Sinnoh myth says Arceus shaped the universe with its thousand arms.",
  778: "Mimikyu wears a homemade Pikachu costume because it wants to be loved.",
  1000: "Gholdengo is #1000 and evolves from Gimmighoul once you collect 999 Gimmighoul Coins."
};

const PRESETS = [
  ["Kanto starters", ["Venusaur", "Charizard", "Blastoise", "Pikachu"]],
  ["Ash's partners", ["Pikachu", "Charizard", "Greninja", "Lucario"]],
  ["Pseudo-legendaries", ["Dragonite", "Tyranitar", "Salamence", "Garchomp"]],
  ["Paldea starters", ["Meowscarada", "Skeledirge", "Quaquaval", "Koraidon"]],
  ["Legends: Z-A Megas", ["Mega Dragonite", "Mega Greninja", "Mega Starmie", "Mega Chandelure"]],
  ["Eevee family", ["Eevee", "Vaporeon", "Jolteon", "Flareon"]],
  ["Creation trio", ["Dialga", "Palkia", "Giratina", "Arceus"]],
  ["Speed demons", ["Regieleki", "Ninjask", "Accelgor", "Electrode"]],
  ["Walls", ["Shuckle", "Blissey", "Snorlax", "Toxapex"]]
];

// ---------- state ----------
let DEX = null, BY_ID = new Map(), SPECIES = {}, DEFAULTS = [], NAME_INDEX = [];
let slots = [null, null, null, null];
let statMode = "base";
const trainers = window.TRAINERS || [];

// ---------- helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const pretty = s => String(s).split(/[-_]/).map(cap).join(" ");
const fmt = (n, d = 1) => Number(n).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const typeBadge = t => `<span class="type" style="background:${TYPE_COLORS[t]}">${t}</span>`;
const dexNo = n => "#" + String(n).padStart(4, "0");
const sp = p => SPECIES[p.s];
const bst = p => p.st.reduce((a, b) => a + b, 0);
const imgFallback = `onerror="if(!this.dataset.f){this.dataset.f=1;this.src=this.dataset.alt}else{this.style.visibility='hidden'}"`;
const pixImg = (p, cls = "") => `<img class="${cls}" src="${PIX(p.id)}" data-alt="${ART(p.id)}" alt="${esc(p.n)}" loading="lazy" ${imgFallback}>`;
const artImg = (p, extra = "") => `<img src="${ART(p.id)}" data-alt="${PIX(p.id)}" alt="${esc(p.n)}" ${extra} ${imgFallback}>`;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 2200);
}
function multiplier(atk, defTypes) {
  return defTypes.reduce((m, d) => m * (DEX.eff[`${atk}>${d}`] ?? 1), 1);
}
function multClass(m, prefix = "m") {
  return m === 0 ? prefix + "0" : m >= 4 ? prefix + "4" : m >= 2 ? prefix + "2" : m <= 0.25 ? prefix + "025" : m < 1 ? prefix + "05" : "";
}
const multText = m => m === 0 ? "0" : m === 0.25 ? "¼" : m === 0.5 ? "½" : m === 1 ? "" : m + "×";

// ---------- lookup ----------
function findByName(name) {
  const k = norm(name);
  const exact = NAME_INDEX.find(e => e.k === k);
  if (exact) return exact.p;
  const m = name.match(/^(.+)-(alola|galar|hisui|paldea|midnight|midday|dusk)$/i);
  if (m) {
    const base = norm(m[1]), suffix = norm(m[2]).slice(0, 4);
    const hit = NAME_INDEX.find(e => !e.p.d && e.k.includes(base) && e.k.includes(suffix));
    if (hit) return hit.p;
    return findByName(m[1]);
  }
  return null;
}
function search(q) {
  q = q.trim();
  if (!q) return [];
  if (/^#?\d+$/.test(q)) {
    const n = parseInt(q.replace("#", ""), 10);
    return DEX.pokemon.filter(p => p.s === n).slice(0, 12);
  }
  const k = norm(q);
  const starts = [], has = [];
  for (const e of NAME_INDEX) {
    if (e.k.startsWith(k) || e.base.startsWith(k)) starts.push(e.p);
    else if (e.k.includes(k)) has.push(e.p);
  }
  starts.sort((a, b) => (b.d - a.d) || a.s - b.s);
  return starts.concat(has).slice(0, 30);
}

// ---------- URL state ----------
function saveUrl() {
  const ids = slots.filter(Boolean).map(p => p.id);
  const url = new URL(location.href);
  if (ids.length) url.searchParams.set("p", ids.join(",")); else url.searchParams.delete("p");
  history.replaceState(null, "", url);
}
function loadUrl() {
  const p = new URLSearchParams(location.search).get("p");
  if (!p) return false;
  const ids = p.split(",").map(Number).map(id => BY_ID.get(id)).filter(Boolean).slice(0, MAX);
  slots = [0, 1, 2, 3].map(i => ids[i] || null);
  return ids.length > 0;
}

// ---------- slots ----------
function setSlots(list) {
  slots = [0, 1, 2, 3].map(i => list[i] || null);
  renderAll();
}
function addPokemon(p) {
  if (slots.some(s => s && s.id === p.id)) { toast(`${p.n} is already in the comparison`); return; }
  let i = slots.findIndex(s => !s);
  if (i === -1) { i = MAX - 1; toast(`Replaced slot 4 with ${p.n}`); }
  slots[i] = p;
  renderAll();
}
function renderSlots() {
  const wrap = $("#slots");
  wrap.innerHTML = slots.map((p, i) => {
    const label = `<div class="slot-label"><span>Slot ${i + 1} · ${VERSION[i]}</span>${p ? `<button class="slot-x" type="button" data-remove="${i}" aria-label="Remove ${esc(p.n)}">×</button>` : ""}</div>`;
    if (!p) return `<div class="slot empty" data-i="${i}">${label}
      <div class="picker"><input id="pick-${i}" type="search" placeholder="Search name or #" autocomplete="off" aria-label="Choose Pokémon for slot ${i + 1}" aria-autocomplete="list"><ul class="results" role="listbox" hidden></ul></div>
      <div class="ghost-ball">?</div><p class="empty-hint">Type a name, a Pokédex number, or tap a quick pick below.</p></div>`;
    const s = sp(p);
    return `<div class="slot" data-i="${i}">${label}
      <div class="slot-art">${artImg(p, 'width="120" height="120"')}</div>
      <div class="slot-name">${esc(p.n)}</div>
      <div class="slot-meta"><span class="dexno">${dexNo(p.s)}</span>${p.t.map(typeBadge).join("")}${s.leg ? '<span class="tag">Legendary</span>' : s.myth ? '<span class="tag">Mythical</span>' : ""}${powerBadges(p)}</div>
      <div class="picker" style="margin-top:8px"><input id="pick-${i}" type="search" placeholder="Swap…" autocomplete="off" aria-label="Swap Pokémon in slot ${i + 1}"><ul class="results" role="listbox" hidden></ul></div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("input[id^=pick-]").forEach(bindPicker);
}
function bindPicker(input) {
  const i = Number(input.id.split("-")[1]);
  const list = input.nextElementSibling;
  let items = [], active = 0;
  const draw = () => {
    list.hidden = !items.length;
    list.innerHTML = items.map((p, j) => `<li role="option" data-j="${j}" aria-selected="${j === active}">${pixImg(p)}<span class="rn">${esc(p.n)}</span><span class="dexno">${dexNo(p.s)}</span>${p.t.map(typeBadge).join("")}${powerBadges(p)}</li>`).join("");
  };
  const choose = j => { const p = items[j]; if (!p) return; slots[i] = p; renderAll(); };
  input.addEventListener("input", () => { items = search(input.value); active = 0; draw(); });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { active = Math.min(items.length - 1, active + 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { active = Math.max(0, active - 1); draw(); e.preventDefault(); }
    else if (e.key === "Enter") { choose(active); e.preventDefault(); }
    else if (e.key === "Escape") { items = []; draw(); }
  });
  list.addEventListener("mousedown", e => { const li = e.target.closest("li"); if (li) { e.preventDefault(); choose(Number(li.dataset.j)); } });
  input.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 120));
}

// ---------- report sections ----------
const LEVELS = { lv50: 50, lv100: 100, lv200: 200 };
function statVal(base, idx, mode) {
  if (mode === "base") return base;
  const lv = LEVELS[mode];
  if (idx === 0) return base === 1 ? 1 : Math.floor((2 * base + 31 + 63) * lv / 100) + lv + 10;
  return Math.floor((Math.floor((2 * base + 31 + 63) * lv / 100) + 5) * 1.1);
}
function radarSVG(list) {
  const size = 300, c = size / 2, R = 110;
  const order = [0, 1, 2, 5, 4, 3]; // HP, Atk, Def, Spe, SpD, SpA around the circle
  const maxv = Math.max(160, ...list.filter(Boolean).flatMap(p => p.st));
  const pt = (k, v) => { const a = -Math.PI / 2 + k * Math.PI / 3; const r = R * v / maxv; return [c + r * Math.cos(a), c + r * Math.sin(a)]; };
  let g = "";
  for (const f of [0.25, 0.5, 0.75, 1]) g += `<polygon class="grid" points="${order.map((_, k) => pt(k, maxv * f).join(",")).join(" ")}"/>`;
  order.forEach((s, k) => {
    const [x, y] = pt(k, maxv); g += `<line class="axis" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/>`;
    const [lx, ly] = pt(k, maxv * 1.17);
    g += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${STAT_SHORT[s]}</text>`;
  });
  list.forEach((p, i) => {
    if (!p) return;
    g += `<polygon class="c${i}" points="${order.map((s, k) => pt(k, p.st[s]).join(",")).join(" ")}" style="fill:color-mix(in srgb, var(--c) 16%, transparent);stroke:var(--c);stroke-width:2.2;stroke-linejoin:round"/>`;
  });
  return `<svg class="radar" viewBox="-10 -6 ${size + 20} ${size + 12}" width="100%" style="max-width:340px" role="img" aria-label="Base stat radar chart">${g}</svg>`;
}
function statsPanel(sel) {
  const vals = sel.map(({ p }) => p.st.map((b, k) => statVal(b, k, statMode)));
  const maxAll = Math.max(...vals.flat(), statMode === "base" ? 160 : 1);
  const rows = STAT_NAMES.map((name, k) => {
    const top = Math.max(...vals.map(v => v[k]));
    return `<tr><th>${name}</th><td><div class="bars">${sel.map(({ i }, j) => {
      const v = vals[j][k];
      return `<div class="bar c${i}"><span>${v}</span><i><b style="width:${(v / maxAll * 100).toFixed(1)}%"></b></i><span class="crown">${sel.length > 1 && v === top ? "★" : ""}</span></div>`;
    }).join("")}</div></td></tr>`;
  }).join("");
  const totals = sel.map(({ p }, j) => vals[j].reduce((a, b) => a + b, 0));
  const tmax = Math.max(...totals);
  const totalRow = `<tr class="total"><th>Total</th><td><div class="bars">${sel.map(({ i }, j) => `<div class="bar c${i}"><span>${totals[j]}</span><i><b style="width:${(totals[j] / tmax * 100).toFixed(1)}%"></b></i><span class="crown">${sel.length > 1 && totals[j] === tmax ? "★" : ""}</span></div>`).join("")}</div></td></tr>`;
  const modeBtn = (m, label) => `<button class="chip" type="button" data-statmode="${m}" aria-pressed="${statMode === m}" style="${statMode === m ? "background:var(--ink);color:var(--bg);border-color:var(--ink)" : ""}">${label}</button>`;
  const note = statMode === "base" ? "Base stats as listed in the games."
    : statMode === "lv200" ? "Just for fun: full potential at Lv. 200, strong enough to face your Legends: Z-A rival. Every stat has 31 IVs, 252 EVs and a boosting nature, and the standard stat formula keeps scaling past Lv. 100."
    : `Maximum stat at Lv. ${LEVELS[statMode]}: 31 IVs, 252 EVs and a boosting nature in every stat.`;
  return `<section class="panel" id="stats">
    <div class="panel-head"><div><span class="eyebrow">Battle profile</span><h2>Stats</h2></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${modeBtn("base", "Base")}${modeBtn("lv50", "Lv. 50 max")}${modeBtn("lv100", "Lv. 100 max")}${modeBtn("lv200", "Lv. 200 max · Z-A rival")}</div></div>
    <div class="two">
      <div class="radar-wrap">${radarSVG(slots)}<div class="legend">${sel.map(({ p, i }) => `<span class="c${i}"><i class="swatch"></i>${esc(p.n)} · ${bst(p)}</span>`).join("")}</div></div>
      <div><table class="stat-table">${rows}${totalRow}</table><p class="mini">${note} ★ marks the highest value.</p></div>
    </div></section>`;
}
function genderCell(gr) {
  if (gr === -1) return "Genderless";
  const f = gr / 8 * 100;
  return `${fmt(100 - f)}% ♂ · ${fmt(f)}% ♀<div class="gender"><span class="m" style="width:${100 - f}%"></span><span class="f" style="width:${f}%"></span></div>`;
}
const catchPct = cr => Math.min(1, Math.pow(cr / 3 / 255, 0.75)) * 100;
function profilePanel(sel) {
  const rows = [
    ["Category", p => esc(sp(p).g)],
    ["Debut", p => `Gen ${ROMAN[sp(p).gen]} · ${REGION_GEN[sp(p).gen]}`],
    ["Status", p => [sp(p).leg && "Legendary", sp(p).myth && "Mythical", sp(p).baby && "Baby", p.mega && "Mega Evolution", !p.d && !p.mega && "Alternate form"].filter(Boolean).join(", ") || "Regular"],
    ["Height", p => `${fmt(p.h / 10)} m <span class="mini">(${Math.floor(p.h * 3.937 / 12)}′${Math.round(p.h * 3.937 % 12)}″)</span>`, p => p.h],
    ["Weight", p => `${fmt(p.w / 10)} kg <span class="mini">(${fmt(p.w * 0.220462)} lb)</span>`, p => p.w],
    ["Base stat total", p => bst(p), p => bst(p)],
    ["Catch rate", p => `${sp(p).cr} <span class="mini">≈${fmt(catchPct(sp(p).cr))}% per Poké Ball at full HP</span>`, p => sp(p).cr],
    ["Base EXP", p => p.x || "—", p => p.x],
    ["Base friendship", p => sp(p).hp],
    ["Growth rate", p => pretty(sp(p).grw)],
    ["Egg groups", p => sp(p).eg.map(pretty).join(", ") || "—"],
    ["Egg cycles", p => sp(p).hc ? `${sp(p).hc} <span class="mini">(≈${fmt(sp(p).hc * 257, 0)} steps in older games)</span>` : "—"],
    ["Gender", p => genderCell(sp(p).gr)],
    ["Colour · shape", p => `${cap(sp(p).c)} · ${pretty(sp(p).sh)}`],
    ["Habitat", p => sp(p).hb ? pretty(sp(p).hb) : "—"],
    ["Pokédex entries", p => `${sp(p).fc} <span class="mini">in English across the games</span>`]
  ];
  const body = rows.map(([label, fn, num]) => {
    let best = null;
    if (num && sel.length > 1) { const vs = sel.map(({ p }) => num(p)); const m = Math.max(...vs); if (vs.filter(v => v === m).length === 1) best = m; }
    return `<tr><th>${label}</th>${sel.map(({ p, i }) => `<td class="c${i}${num && best !== null && num(p) === best ? " win" : ""}">${fn(p)}</td>`).join("")}</tr>`;
  }).join("");
  return `<section class="panel" id="profile">
    <div class="panel-head"><div><span class="eyebrow">Field notes</span><h2>Profile, training &amp; breeding</h2></div><p>▲ marks the highest value</p></div>
    <div class="scroll"><table class="dt"><thead><tr><th></th>${sel.map(({ p, i }) => `<th class="c${i}"><span class="swatch"></span>${esc(p.n)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div></section>`;
}
function sizePanel(sel) {
  const maxH = Math.max(1, ...sel.map(({ p }) => p.h));
  const step = [1, 2, 5, 10, 20, 50, 100, 200].find(s => maxH / s <= 6);
  let rulers = "";
  for (let v = step; v <= maxH; v += step) rulers += `<div class="ruler" style="bottom:${(v / maxH * 100).toFixed(2)}%">${fmt(v / 10)} m</div>`;
  const figs = sel.map(({ p, i }) => `<div class="fig c${i}"><img src="${ART(p.id)}" data-alt="${PIX(p.id)}" alt="${esc(p.n)}" style="height:${Math.max(3, p.h / maxH * 100 * 1.08).toFixed(1)}%" ${imgFallback}></div>`).join("");
  const maxW = Math.max(...sel.map(({ p }) => p.w));
  const weigh = sel.map(({ p, i }) => `<div class="weigh-row c${i}"><span>${esc(p.n)}</span><i style="width:${(p.w / maxW * 100).toFixed(1)}%"></i><span>${fmt(p.w / 10)} kg</span></div>`).join("");
  const pika = BY_ID.get(25);
  const pikas = sel.map(({ p, i }) => `<li class="c${i}"><strong>${esc(p.n)}</strong> weighs as much as <b>${fmt(p.w / pika.w)}</b> Pikachu.</li>`).join("");
  return `<section class="panel" id="size">
    <div class="panel-head"><div><span class="eyebrow">To scale</span><h2>Size line-up</h2></div><p>Official artwork scaled to each Pokémon's listed height.</p></div>
    <div class="two">
      <div><div class="lineup">${rulers}${figs}</div>
        <div class="lineup-labels">${sel.map(({ p, i }) => `<div class="c${i}" style="color:var(--c)">${fmt(p.h / 10)} m</div>`).join("")}</div></div>
      <div><h3 style="font-size:1rem;margin-bottom:10px">On the scales</h3><div class="weigh">${weigh}</div>
        <ul class="mini" style="padding-left:18px;margin-top:14px;display:grid;gap:6px">${pikas}</ul></div>
    </div></section>`;
}
function matchupPanel(sel) {
  const types = DEX.types;
  const def = types.map(t => `<tr><th>${typeBadge(t)}</th>${sel.map(({ p }) => { const m = multiplier(t, p.t); return `<td class="${multClass(m)}">${multText(m)}</td>`; }).join("")}</tr>`).join("");
  const summary = sel.map(({ p, i }) => {
    const ms = types.map(t => multiplier(t, p.t));
    const weak = ms.filter(m => m > 1).length, resist = ms.filter(m => m < 1 && m > 0).length, immune = ms.filter(m => m === 0).length;
    return `<div class="col c${i}"><h3>${esc(p.n)}</h3><div class="mini">${weak} weaknesses · ${resist} resistances · ${immune} immunities</div>
      <div class="mini" style="margin-top:4px">Weak to: ${types.filter((t, k) => ms[k] > 1).map(t => `${typeBadge(t)}${ms[types.indexOf(t)] >= 4 ? "<b>×4</b>" : ""}`).join(" ") || "nothing"}</div></div>`;
  }).join("");
  let h2h = "";
  if (sel.length > 1) {
    const best = (a, b) => Math.max(...a.t.map(t => multiplier(t, b.t)));
    h2h = `<h3 style="font-size:1rem;margin:20px 0 8px">Head to head</h3>
      <p class="mini" style="margin:0 0 8px">Best same-type (STAB) attack from the row Pokémon against the column Pokémon.</p>
      <div class="scroll"><table class="mx h2h"><thead><tr><th>Attacker ↓ / Target →</th>${sel.map(({ p, i }) => `<th class="c${i}"><span class="swatch"></span>${esc(p.n)}</th>`).join("")}</tr></thead><tbody>
      ${sel.map(({ p: a, i }) => `<tr><th class="c${i}" style="text-align:left"><span class="swatch"></span>${esc(a.n)}</th>${sel.map(({ p: b }) => {
        if (a.id === b.id) return `<td class="self">—</td>`;
        const m = best(a, b); return `<td class="${multClass(m, "a")}">${m === 1 ? "1×" : multText(m) + (m < 1 && m > 0 ? "×" : "")}</td>`;
      }).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  return `<section class="panel" id="matchups">
    <div class="panel-head"><div><span class="eyebrow">Type chart</span><h2>Matchups</h2></div><p>Damage taken from each attacking type. Abilities such as Levitate are not counted.</p></div>
    <div class="cols" style="margin-bottom:16px">${summary}</div>
    <div class="two"><div class="scroll"><table class="mx"><thead><tr><th>Attack</th>${sel.map(({ p, i }) => `<th class="c${i}"><span class="swatch"></span>${esc(p.n.length > 12 ? p.n.slice(0, 11) + "…" : p.n)}</th>`).join("")}</tr></thead><tbody>${def}</tbody></table></div>
    <div>${h2h || '<p class="mini">Add a second Pokémon to see who hits whom harder.</p>'}</div></div></section>`;
}
function speedPanel(sel) {
  const order = [...sel].sort((a, b) => b.p.st[5] - a.p.st[5]);
  const max = Math.max(...order.map(o => o.p.st[5]), 1);
  const lanes = order.map(({ p, i }, k) => `<div class="lane c${i}"><span class="pos">${k + 1}</span><span class="name">${esc(p.n)} <span class="dexno">${p.st[5]}</span></span><div class="track">${pixImg(p, "runner")}</div></div>`).join("");
  let note = "";
  if (order.length > 1) {
    const a = order[0].p, b = order[order.length - 1].p;
    note = a.st[5] === b.st[5] ? "Speed tie: in battle, turn order is decided at random." : `${esc(a.n)} moves first. At Lv. 100 with max Speed it reaches ${statVal(a.st[5], 5, "lv100")} Speed against ${esc(b.n)}'s ${statVal(b.st[5], 5, "lv100")}.`;
  }
  return `<section class="panel" id="speed">
    <div class="panel-head"><div><span class="eyebrow">Turn order</span><h2>Speed race</h2></div><p>${note}</p></div>
    <div class="race" data-max="${max}">${lanes}</div></section>`;
}
function abilityPanel(sel) {
  return `<section class="panel" id="abilities">
    <div class="panel-head"><div><span class="eyebrow">Passive effects</span><h2>Abilities</h2></div></div>
    <div class="cols">${sel.map(({ p, i }) => `<div class="col c${i}"><h3>${esc(p.n)}</h3>${p.a.map(([id, hid]) => {
      const [name, desc] = DEX.abilities[id] || ["Unknown", ""];
      return `<p class="ab"><b>${esc(name)}${hid ? '<span class="hid">Hidden</span>' : ""}</b>${esc(desc)}</p>`;
    }).join("")}</div>`).join("")}</div></section>`;
}
function evoChain(p) {
  const ch = sp(p).ch;
  const members = Object.entries(SPECIES).filter(([, s]) => s.ch === ch).map(([id, s]) => ({ id: Number(id), s }));
  const depth = id => { let d = 0, cur = SPECIES[id]; while (cur && cur.from) { d++; cur = SPECIES[cur.from]; } return d; };
  const stages = [];
  members.forEach(m => { const d = depth(m.id); (stages[d] = stages[d] || []).push(m); });
  return stages.filter(Boolean).map(st => st.sort((a, b) => a.id - b.id));
}
function evoPanel(sel) {
  return `<section class="panel" id="evolution">
    <div class="panel-head"><div><span class="eyebrow">Family tree</span><h2>Evolution</h2></div><p>Tap a family member to put it in that slot.</p></div>
    <div class="cols">${sel.map(({ p, i }) => {
      const stages = evoChain(p);
      const body = stages.length < 2 && stages[0]?.length === 1 ? `<p class="mini">${esc(sp(p).n)} does not evolve.</p>` :
        `<div class="evo">${stages.map((st, k) => `${k ? '<span class="arrow">→</span>' : ""}<span style="display:grid;gap:2px">${st.map(m => {
          const mp = BY_ID.get(m.id);
          return `<button type="button" class="${m.id === p.s ? "cur" : ""}" data-evo="${i}:${m.id}">${pixImg(mp)}<span>${esc(m.s.n)}</span>${m.s.ev ? `<span class="arrow">${esc(m.s.ev)}</span>` : ""}</button>`;
        }).join("")}</span>`).join("")}</div>`;
      return `<div class="col c${i}"><h3>${esc(p.n)}</h3>${body}</div>`;
    }).join("")}</div></section>`;
}
function powerPanel(sel) {
  return `<section class="panel" id="powerups">
    <div class="panel-head"><div><span class="eyebrow">Power-ups</span><h2>Mega, Gigantamax &amp; Tera</h2></div><p>Tera is open to any generation, unless the Pokémon has a Mega or Gigantamax form, or is legendary, Paradox or an Ultra Beast. Mythicals with a base stat total of 600 or less can Terastallize.</p></div>
    <div class="cols">${sel.map(({ p, i }) => {
      const f = formsOf(p.s), rows = [];
      const others = [...f.mega, ...f.gmax].filter(x => x.id !== p.id);
      const base = !p.d ? BY_ID.get(p.s) : null;
      if (p.mega || isGmax(p)) rows.push(`<p class="ab"><b>${p.mega ? "Mega Evolved form" : "Gigantamax form"}</b>${p.mega ? `Base stat total ${bst(p)}, up ${bst(p) - bst(BY_ID.get(p.s))} from the regular form.` : "Same base stats, but towers over the battlefield and uses G-Max Moves."}</p>`);
      if (others.length || (base && (p.mega || isGmax(p)))) rows.push(`<div class="pw-forms">${[...(base && (p.mega || isGmax(p)) ? [base] : []), ...others].map(x => `<button type="button" data-evo="${i}:${x.id}" title="Swap in ${esc(x.n)}">${pixImg(x)}<span>${esc(x.n)}</span>${x.mega ? `<span class="arrow">BST ${bst(x)}</span>` : ""}</button>`).join("")}</div>`);
      if (canTera(p)) {
        const t = teraPicks(p);
        rows.push(`<p class="ab"><b>Terastal</b>Can Terastallize into any type.</p>
          <p class="ab"><span class="pw pw-tera">Attack</span> Tera ${t.offense.map(typeBadge).join(" or ")}: same-type moves hit at 2× instead of 1.5×. It's a ${t.atk} attacker.</p>
          <p class="ab"><span class="pw pw-tera">Defend</span> Tera ${typeBadge(t.defense.T)}: resists ${t.defense.covers} of its ${DEX.types.filter(a => multiplier(a, p.t) > 1).length} current weaknesses.</p>`);
      } else if (!f.mega.length && !f.gmax.length && !p.mega && !isGmax(p)) {
        rows.push(`<p class="ab"><b>No power-up</b>${specialLabel(p) === "Mythical" ? `Its base stat total of ${bst(p)} is over the 600 limit for mythical Tera, so it relies on raw stats.` : `${esc(specialLabel(p))} Pokémon rely on raw stats: no Mega, no Gigantamax and no Tera.`}</p>`);
      }
      return `<div class="col c${i}"><h3>${esc(p.n)} ${powerBadges(p)}</h3>${rows.join("")}</div>`;
    }).join("")}</div></section>`;
}
function dexPanel(sel) {
  return `<section class="panel" id="dex">
    <div class="panel-head"><div><span class="eyebrow">Latest English entry</span><h2>Pokédex</h2></div></div>
    <div class="cols">${sel.map(({ p, i }) => `<div class="col c${i}"><h3>${esc(sp(p).n)} <span class="dexno">${dexNo(p.s)}</span></h3><p class="dex-quote">${esc(sp(p).f || "No entry yet.")}</p></div>`).join("")}</div></section>`;
}
// Trainer teams show fully evolved Pokémon. Pikachu stays as is (it's the series mascot),
// and branching lines (Eevee, Cosmog…) or regional forms keep the listed Pokémon.
let CHILDREN = null;
function finals(sid) {
  if (!CHILDREN) {
    CHILDREN = {};
    for (const [id, s] of Object.entries(SPECIES)) if (s.from) (CHILDREN[s.from] = CHILDREN[s.from] || []).push(Number(id));
  }
  const kids = CHILDREN[sid];
  return kids ? kids.flatMap(finals) : [sid];
}
function toFinal(p) {
  if (!p.d || p.s === 25) return p;
  const f = [...new Set(finals(p.s))];
  return f.length === 1 ? BY_ID.get(f[0]) || p : p;
}
function finalTeam(t) {
  const seen = new Set();
  return t.team.map(findByName).filter(Boolean).map(toFinal).filter(p => !seen.has(p.id) && seen.add(p.id));
}
// Every card shows six. Slots the games leave empty are filled with fully evolved,
// non-legendary Pokémon of the trainer's speciality (or their team's types) from their era.
const UB = new Set([793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806]);
const PARADOX = new Set([984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006, 1007, 1008, 1009, 1010, 1020, 1021, 1022, 1023]);
function specialLabel(p) {
  const s = sp(p);
  if (PARADOX.has(p.s)) return s.leg ? "Paradox legendary" : "Paradox";
  if (UB.has(p.s)) return "Ultra Beast";
  return s.myth ? "Mythical" : s.leg ? "Legendary" : "";
}
// Team rule: box legendaries never join the six, and a team holds at most one "special":
// a Mega, Paradox, other legendary or mythical, Ultra Beast, or powered-up form.
const BOX = new Set([249, 250, 382, 383, 384, 483, 484, 487, 643, 644, 646, 716, 717, 718, 789, 790, 791, 792, 800, 888, 889, 890, 898, 1007, 1008, 1024]);
// Super legendaries (box legends plus Mewtwo, Arceus and Hoopa) become a seventh "secret boss",
// like Arceus waiting after the final battle in Legends: Arceus. Each appears in its strongest form.
const SUPER = new Set([...BOX, 150, 493, 720]);
const BOSS_FORM = { 150: 10044, 382: 10077, 383: 10078, 384: 10079, 483: 10245, 484: 10246, 487: 10007, 646: 10022, 718: 10120, 720: 10086, 800: 10157, 888: 10188, 889: 10189, 898: 10194, 1024: 10277 };
function secretBoss(t) {
  const names = [...t.team, ...(t.leg || []).map(x => x[0]), ...(t.pmex || [])];
  const p = names.map(findByName).find(p => p && SUPER.has(p.s));
  return p ? BY_ID.get(BOSS_FORM[p.s]) || p : null;
}
const isSpecial = p => !!(p.mega || specialLabel(p) || /primal|crowned|ultra |eternamax|gigantamax|origin/i.test(p.n));
// Power-ups. Each Pokémon gets one route to power: Mega Evolution, Gigantamax, or Terastal.
// Tera is open to every generation, unless the species has a Mega or Gigantamax form,
// or is legendary, Paradox or an Ultra Beast. Mythicals qualify if their base stat total is 600 or less.
let FORMS = null;
function formsOf(sid) {
  if (!FORMS) {
    FORMS = {};
    for (const p of DEX.pokemon) {
      const f = (FORMS[p.s] = FORMS[p.s] || { mega: [], gmax: [] });
      if (p.mega) f.mega.push(p); else if (/^Gigantamax /.test(p.n)) f.gmax.push(p);
    }
  }
  return FORMS[sid] || { mega: [], gmax: [] };
}
const isGmax = p => /^Gigantamax /.test(p.n);
function canTera(p) {
  const f = formsOf(p.s);
  const lab = specialLabel(p);
  return !f.mega.length && !f.gmax.length && !p.mega && !isGmax(p) && (!lab || (lab === "Mythical" && bst(p) <= 600));
}
function powerBadges(p) {
  const f = formsOf(p.s), out = [];
  if (p.mega) out.push(`<span class="pw pw-mega" title="Mega Evolved form">Mega</span>`);
  else if (f.mega.length) out.push(`<span class="pw pw-mega" title="Can Mega Evolve">Mega</span>`);
  if (isGmax(p)) out.push(`<span class="pw pw-gmax" title="Gigantamax form">G-Max</span>`);
  else if (f.gmax.length) out.push(`<span class="pw pw-gmax" title="Has a Gigantamax form">G-Max</span>`);
  if (canTera(p)) out.push(`<span class="pw pw-tera" title="Can Terastallize">Tera</span>`);
  return out.join("");
}
function teraPicks(p) {
  const types = DEX.types;
  const weakTo = types.filter(a => multiplier(a, p.t) > 1);
  const scored = types.map(T => ({ T, covers: weakTo.filter(a => multiplier(a, [T]) < 1).length, weak: types.filter(a => multiplier(a, [T]) > 1).length }))
    .sort((a, b) => b.covers - a.covers || a.weak - b.weak);
  const atk = p.st[1] === p.st[3] ? "mixed" : p.st[1] > p.st[3] ? "physical" : "special";
  return { offense: p.t, defense: scored[0], atk };
}
const REGION_TO_GEN = { Kanto: 1, Johto: 2, Hoenn: 3, Sinnoh: 4, Hisui: 4, Unova: 5, Kalos: 6, Alola: 7, Galar: 8, Paldea: 9, Pasio: 9 };
let FILL_POOL = null;
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }
function fullTeam(t) {
  if (!FILL_POOL) { finals(1); FILL_POOL = DEFAULTS.filter(p => !CHILDREN[p.s] && !specialLabel(p) && !sp(p).baby).sort((a, b) => bst(b) - bst(a)); }
  const base = finalTeam(t).filter(p => !SUPER.has(p.s));
  const ace = [...base].reverse().find(isSpecial);
  const out = base.filter(p => !isSpecial(p) || p === ace).map(p => ({ p, filled: false }));
  const have = new Set(out.map(o => o.p.s));
  const push = p => { if (out.length < 6 && !have.has(p.s)) { have.add(p.s); out.push({ p, filled: true }); } };
  (t.pmex || []).map(findByName).filter(Boolean).map(toFinal).forEach(p => !isSpecial(p) && !SUPER.has(p.s) && push(p));
  const gen = REGION_TO_GEN[t.r] || 9;
  const types = t.ty ? [t.ty] : [...new Set(out.flatMap(o => o.p.t))];
  const rand = seeded(t.n);
  const pick = list => { const top = list.slice(0, 24); while (out.length < 6 && top.length) push(top.splice(Math.floor(rand() * top.length), 1)[0]); };
  pick(FILL_POOL.filter(p => sp(p).gen <= gen && p.t.some(x => types.includes(x))));
  pick(FILL_POOL.filter(p => sp(p).gen <= gen));
  // Every team carries exactly one power-up. With no special already, the ace (last real
  // member, falling back down the team) powers up: Mega if it can, else Gigantamax, else Tera.
  if (!out.some(o => isSpecial(o.p))) {
    const order = [...out.keys()].sort((x, y) => (out[x].filled - out[y].filled) || y - x);
    for (const k of order) {
      const p = out[k].p, f = formsOf(p.s);
      if (p.d && f.mega.length) { out[k] = { p: f.mega[0], filled: out[k].filled, power: "mega" }; break; }
      if (p.d && f.gmax.length) { out[k] = { p: f.gmax[0], filled: out[k].filled, power: "gmax" }; break; }
      if (canTera(p)) { out[k].power = "tera"; break; }
    }
  }
  return out;
}
function syncPairs(t) {
  return [...(t.pmex || []).map(n => [n, ""]), ...(t.leg || [])].map(([n, outfit]) => ({ p: findByName(n), outfit })).filter(x => x.p);
}
function trainersUsing(p) {
  const base = norm(sp(p).n);
  return trainers.filter(t => finalTeam(t).some(m => m.s === p.s) || (t.pmex || []).some(n => norm(n) === base));
}

// computed superlatives across every default species
let RANKS = null;
function buildRanks() {
  RANKS = { stat: [0, 1, 2, 3, 4, 5].map(k => DEFAULTS.map(p => p.st[k]).sort((a, b) => b - a)), bst: DEFAULTS.map(bst).sort((a, b) => b - a), h: DEFAULTS.map(p => p.h).sort((a, b) => b - a), w: DEFAULTS.map(p => p.w).sort((a, b) => b - a) };
}
const rankOf = (arr, v) => arr.filter(x => x > v).length + 1;
function factsPanel(sel) {
  const facts = [];
  const add = (k, html, i) => facts.push(`<div class="fact${i !== undefined ? " c" + i : ""}"><span class="k">${k}</span>${html}</div>`);
  sel.forEach(({ p, i }) => {
    const s = sp(p), name = `<strong>${esc(p.n)}</strong>`;
    if (TRIVIA[p.s]) add("Trivia", `${name}: ${esc(TRIVIA[p.s])}`, i);
    const r = rankOf(RANKS.bst, bst(p));
    const pct = Math.round((1 - (r - 1) / RANKS.bst.length) * 100);
    add("Power ranking", `${name}'s base stat total of ${bst(p)} ${r <= 1 ? "is the highest of any species" : `ranks #${r} of ${RANKS.bst.length} species${p.d ? "" : " (compared with regular forms)"}, beating about ${pct}% of them`}.`, i);
    p.st.forEach((v, k) => {
      const rk = rankOf(RANKS.stat[k], v);
      if (rk === 1) add("Record holder", `${name} has the highest base ${STAT_NAMES[k]} (${v}) in the National Pokédex${p.d ? "" : " when compared with regular forms"}.`, i);
      else if (rk <= 10) add("Top 10", `${name}'s base ${STAT_NAMES[k]} of ${v} is in the top 10 of all species.`, i);
      if (v === Math.min(...RANKS.stat[k])) add("Record low", `${name} shares the lowest base ${STAT_NAMES[k]} (${v}) in the National Pokédex.`, i);
    });
    if (rankOf(RANKS.w, p.w) <= 15) add("Heavyweight", `At ${fmt(p.w / 10)} kg, ${name} is one of the 15 heaviest Pokémon.`, i);
    if (rankOf(RANKS.h, p.h) <= 15) add("Giant", `At ${fmt(p.h / 10)} m, ${name} is one of the 15 tallest Pokémon.`, i);
    if (s.cr <= 3) add("Hard to catch", `${name} has a catch rate of ${s.cr}, the lowest possible tier. A regular Poké Ball at full HP has only about a ${fmt(catchPct(s.cr))}% chance.`, i);
    if (s.cr === 255) add("Easy catch", `${name} has the maximum catch rate of 255.`, i);
    if (s.eg.includes("no-eggs") && !s.leg && !s.myth && !s.baby) add("Can't breed", `${name} is in the Undiscovered egg group, so it can't produce eggs.`, i);
    if (s.fc >= 30) add("Well documented", `${name} has ${s.fc} English Pokédex entries across the games.`, i);
    const tu = trainersUsing(p);
    if (tu.length) add("Trainer favourite", `${name} is on the team of ${tu.slice(0, 6).map(t => `<button class="tlink" type="button" data-trainer="${esc(t.n)}">${esc(t.n)}</button>`).join(" ")}${tu.length > 6 ? ` and ${tu.length - 6} more` : ""}.${tu.some(t => (t.pmex || []).some(n => norm(n) === norm(s.n))) ? " It is also a Pokémon Masters EX sync-pair partner." : ""}`, i);
  });
  if (sel.length > 1) {
    const ps = sel.map(o => o.p);
    const heavy = ps.reduce((a, b) => (b.w > a.w ? b : a)), light = ps.reduce((a, b) => (b.w < a.w ? b : a));
    if (heavy.w !== light.w) add("Scale", `<strong>${esc(heavy.n)}</strong> is ${fmt(heavy.w / light.w)}× heavier than <strong>${esc(light.n)}</strong>.`);
    const tall = ps.reduce((a, b) => (b.h > a.h ? b : a)), short = ps.reduce((a, b) => (b.h < a.h ? b : a));
    if (tall.h !== short.h) add("Height gap", `You could stack ${fmt(tall.h / short.h)} <strong>${esc(short.n)}</strong> to reach the top of <strong>${esc(tall.n)}</strong>.`);
    const tw = ps.reduce((a, p) => a + p.w, 0);
    add("Team weight", `Together they weigh ${fmt(tw / 10)} kg, the same as ${fmt(tw / 60, 0)} Pikachu.`);
    for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
      const A = ps[a], B = ps[b];
      if (sp(A).ch === sp(B).ch && A.s !== B.s) add("Family", `<strong>${esc(A.n)}</strong> and <strong>${esc(B.n)}</strong> belong to the same evolution family.`);
      const shared = sp(A).eg.filter(g => sp(B).eg.includes(g) && g !== "no-eggs");
      if (A.s !== B.s && shared.length && sp(A).gr !== -1 && sp(B).gr !== -1 && !(sp(A).gr === 0 && sp(B).gr === 0) && !(sp(A).gr === 8 && sp(B).gr === 8))
        add("Breeding", `<strong>${esc(A.n)}</strong> and <strong>${esc(B.n)}</strong> share the ${pretty(shared[0])} egg group, so they can breed together.`);
      const aHits = Math.max(...A.t.map(t => multiplier(t, B.t))), bHits = Math.max(...B.t.map(t => multiplier(t, A.t)));
      if (aHits >= 2 && bHits < 1) add("Mismatch", `<strong>${esc(A.n)}</strong> hits <strong>${esc(B.n)}</strong> super-effectively, while ${esc(B.n)}'s STAB attacks are resisted.`);
      if (bHits >= 2 && aHits < 1) add("Mismatch", `<strong>${esc(B.n)}</strong> hits <strong>${esc(A.n)}</strong> super-effectively, while ${esc(A.n)}'s STAB attacks are resisted.`);
    }
    const gens = new Set(ps.map(p => sp(p).gen));
    if (gens.size === ps.length && ps.length > 2) add("Across time", `This line-up spans ${gens.size} generations: ${[...gens].sort().map(g => REGION_GEN[g]).join(", ")}.`);
  }
  return `<section class="panel" id="facts">
    <div class="panel-head"><div><span class="eyebrow">Did you know</span><h2>Fun facts</h2></div><p>Records are worked out live from the full Gen I–IX dataset.</p></div>
    <div class="facts">${facts.join("")}</div></section>`;
}

function renderReport() {
  const sel = slots.map((p, i) => ({ p, i })).filter(o => o.p);
  const report = $("#report");
  if (!sel.length) {
    report.innerHTML = `<div class="welcome panel"><p><strong>Pick up to four Pokémon</strong> to compare stats, size, type matchups, speed, abilities, evolution and fun facts.</p><p>Try a quick pick above, or press <strong>Random 4</strong>.</p></div>`;
    return;
  }
  report.innerHTML = statsPanel(sel) + speedPanel(sel) + matchupPanel(sel) + sizePanel(sel) + profilePanel(sel) + abilityPanel(sel) + powerPanel(sel) + evoPanel(sel) + dexPanel(sel) + factsPanel(sel);
  // animate runners from the start line to their resting spot
  const race = $(".race", report);
  if (race) {
    const max = Number(race.dataset.max);
    const runners = race.querySelectorAll(".runner");
    const order = [...sel].sort((a, b) => b.p.st[5] - a.p.st[5]);
    runners.forEach((r, k) => { r.style.left = `${(order[k].p.st[5] / max * 92 + 4).toFixed(1)}%`; });
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      runners.forEach(r => { const end = r.style.left; r.style.transition = "none"; r.style.left = "4%"; r.getBoundingClientRect(); r.style.transition = ""; r.style.left = end; });
    }
  }
}
function renderAll() {
  renderSlots();
  renderReport();
  saveUrl();
}

// ---------- presets & actions ----------
function renderPresets() {
  $("#presets").innerHTML = `<span>Quick picks</span>` + PRESETS.map(([label], k) => `<button class="chip" type="button" data-preset="${k}">${label}</button>`).join("");
}
function randomFour() {
  const pool = DEFAULTS.slice(); const out = [];
  while (out.length < MAX) { const p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; out.push(p); }
  setSlots(out);
}

// ---------- trainers ----------
function trainerColor(t) { return t.ty ? TYPE_COLORS[t.ty] : "var(--ink)"; }
function initials(n) { return n.replace(/^(Professor|Chairman|Lt\.)\s+/, "").split(/[\s&]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase(); }
function renderTrainerFilters() {
  const regions = [...new Set(trainers.map(t => t.r))];
  const roles = [...new Set(trainers.map(t => t.role))].sort();
  $("#tr-region").innerHTML = `<option value="">All regions</option>` + regions.map(r => `<option>${r}</option>`).join("");
  $("#tr-role").innerHTML = `<option value="">All roles</option>` + roles.map(r => `<option>${r}</option>`).join("");
}
function renderTrainers() {
  const q = norm($("#tr-q").value), region = $("#tr-region").value, role = $("#tr-role").value, onlyPmex = $("#tr-pmex").checked, onlyLeg = $("#tr-leg").checked;
  const list = trainers.filter(t => (!region || t.r === region) && (!role || t.role === role) && (!onlyPmex || syncPairs(t).length) && (!onlyLeg || syncPairs(t).some(x => specialLabel(x.p))) &&
    (!q || norm(t.n).includes(q) || (t.ty && t.ty.includes(q)) || t.team.some(n => norm(n).includes(q)) || syncPairs(t).some(x => norm(x.p.n).includes(q))));
  $("#tr-count").textContent = `${list.length} trainer${list.length === 1 ? "" : "s"}${onlyLeg ? " with a legendary, Ultra Beast or Paradox sync pair" : onlyPmex ? " with a Masters EX sync pair" : ""}`;
  $("#tr-grid").innerHTML = list.map(t => {
    const idx = trainers.indexOf(t);
    const team = fullTeam(t);
    const power = team.reduce((sum, { p }) => sum + p.st.reduce((a, b, k) => a + statVal(b, k, "lv200"), 0), 0);
    const sync = syncPairs(t);
    const boss = secretBoss(t);
    const teraAce = (team.find(o => o.power === "tera") || {}).p || null;
    const teraType = teraAce ? (t.tera && canTera(teraAce) ? t.tera : t.ty || teraAce.t[0]) : null;
    const powered = team.find(o => o.power === "mega" || o.power === "gmax");
    const bossPower = boss ? boss.st.reduce((a, b, k) => a + statVal(b, k, "lv200"), 0) : 0;
    return `<article class="tcard" style="--tc:${trainerColor(t)}" id="t-${idx}">
      <div class="tcard-top"><div class="mono-av" aria-hidden="true">${initials(t.n)}</div>
        <div style="min-width:0"><h3>${esc(t.n)}</h3><div class="role">${esc(t.role)} · ${esc(t.r)}</div></div>
        <div style="margin-left:auto">${t.ty ? typeBadge(t.ty) : ""}</div></div>
      <div class="team">${team.map(({ p, filled }, k) => `<button type="button" class="${filled ? "filled" : ""}${teraAce && p === teraAce ? " tera-ace" : ""}" data-add="${p.id}" title="${filled ? "Filler pick to complete the six. " : ""}Add ${esc(p.n)} to compare">${pixImg(p)}</button>`).join("")}</div>
      ${powered ? `<p class="tera-line"><span class="pw pw-${powered.power}">${powered.power === "mega" ? "Mega" : "G-Max"}</span> Ace powers up as ${esc(powered.p.n)}</p>` : ""}
      ${teraAce ? `<p class="tera-line"><span class="pw pw-tera">Tera</span> Ace ${esc(teraAce.n)} Terastallizes into ${typeBadge(teraType)}</p>` : ""}
      ${boss ? `<button type="button" class="boss" data-add="${boss.id}" title="Add ${esc(boss.n)} to compare">${pixImg(boss)}<span><span class="boss-k">Pokémon #7 · Secret boss</span><b>${esc(boss.n)}</b><span class="mini">Waits after the final battle · BST ${bst(boss)}</span></span></button>` : ""}
      ${team.some(o => o.filled) ? `<p class="fill-note">Dashed slots are filler picks to complete the six.</p>` : ""}
      ${sync.length ? `<div class="sync-list"><span class="ex">MASTERS EX SYNC PAIRS</span>${sync.map(({ p, outfit }) => { const lab = specialLabel(p); return `<button type="button" class="sync${lab ? " legend" : ""}" data-add="${p.id}" title="Add ${esc(p.n)} to compare">${pixImg(p)}<span>${outfit ? `<i>${esc(outfit)}</i> ` : ""}<b>${esc(t.n)} &amp; ${esc(sp(p).n)}</b>${lab ? ` <span class="tag">${lab}</span>` : ""}</span></button>`; }).join("")}</div>` : ""}
      <p class="tfact">${esc(t.fact)}</p>
      <div class="tcard-foot"><span class="debut">${esc(t.debut)}<br>Lv. 200 maxed team power: <b>${power.toLocaleString("en-GB")}</b>${boss ? `<br>With secret boss: <b>${(power + bossPower).toLocaleString("en-GB")}</b>` : ""}</span><button class="btn small" type="button" data-team="${idx}">Compare team</button></div>
    </article>`;
  }).join("") || `<p class="mini">No trainers match those filters.</p>`;
}

// ---------- routing ----------
function route() {
  const view = location.hash === "#trainers" ? "trainers" : "compare";
  $("#view-compare").hidden = view !== "compare";
  $("#view-trainers").hidden = view !== "trainers";
  document.querySelectorAll(".tab").forEach(a => a.setAttribute("aria-selected", String(a.dataset.view === view)));
  if (view === "trainers" && !$("#tr-grid").children.length) renderTrainers();
}

// ---------- events ----------
document.addEventListener("click", e => {
  const t = e.target.closest("button, a");
  if (!t) return;
  if (t.dataset.remove !== undefined) { slots[Number(t.dataset.remove)] = null; renderAll(); }
  else if (t.dataset.preset !== undefined) setSlots(PRESETS[Number(t.dataset.preset)][1].map(findByName).filter(Boolean));
  else if (t.dataset.statmode) { statMode = t.dataset.statmode; renderReport(); $("#stats").scrollIntoView({ block: "nearest" }); }
  else if (t.dataset.evo) { const [i, id] = t.dataset.evo.split(":").map(Number); const p = BY_ID.get(id); if (p && !slots.some(s => s && s.id === p.id)) { slots[i] = p; renderAll(); } }
  else if (t.dataset.add) { addPokemon(BY_ID.get(Number(t.dataset.add))); location.hash = "#compare"; window.scrollTo({ top: 0 }); }
  else if (t.dataset.team !== undefined) {
    const tr = trainers[Number(t.dataset.team)];
    statMode = "lv200";
    const ft = fullTeam(tr), real = ft.filter(o => !o.filled).map(o => o.p);
    setSlots((real.length >= MAX ? real.slice(-MAX) : real.concat(ft.filter(o => o.filled).map(o => o.p))).slice(0, MAX));
    location.hash = "#compare"; window.scrollTo({ top: 0 }); toast(`Comparing ${tr.n}'s team`);
  }
  else if (t.dataset.trainer) {
    location.hash = "#trainers"; $("#tr-q").value = t.dataset.trainer; $("#tr-region").value = ""; $("#tr-role").value = ""; $("#tr-pmex").checked = false; $("#tr-leg").checked = false; renderTrainers();
  }
  else if (t.id === "btn-random") randomFour();
  else if (t.id === "btn-clear") setSlots([]);
  else if (t.id === "btn-share") {
    const url = location.href;
    navigator.clipboard?.writeText(url).then(() => toast("Link copied"), () => toast("Copy the address bar to share this comparison"));
  }
});
["#tr-q", "#tr-region", "#tr-role", "#tr-pmex", "#tr-leg"].forEach(s => $(s).addEventListener("input", renderTrainers));
window.addEventListener("hashchange", route);

// ---------- boot ----------
fetch("data/dex.json").then(r => r.json()).then(data => {
  DEX = data; SPECIES = data.species;
  for (const p of data.pokemon) BY_ID.set(p.id, p);
  DEFAULTS = data.pokemon.filter(p => p.d);
  NAME_INDEX = data.pokemon.map(p => ({ p, k: norm(p.n), base: norm(SPECIES[p.s].n) }));
  buildRanks();
  renderPresets();
  renderTrainerFilters();
  if (!loadUrl()) slots = ["Charizard", "Garchomp", "Mega Greninja", "Pikachu"].map(findByName);
  renderAll();
  route();
}).catch(err => {
  $("#report").innerHTML = `<div class="panel welcome"><p><strong>Couldn't load the Pokédex data.</strong> Reload the page. If you opened index.html straight from your disk, serve the folder over HTTP instead (for example <code>npx serve</code>).</p></div>`;
  console.error(err);
});
})();
