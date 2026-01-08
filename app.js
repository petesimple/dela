/* RackTiles v0.1 - pass-and-play racks + basic table placement + themes */

const STORAGE_KEY = "racktiles_state_v01";
const DEFAULT_PLAYERS = ["Player 1", "Player 2"];

const THEMES = [
  {
    id: "classic",
    name: "Classic",
    vars: {
      "--bg": "#0f0f12",
      "--panel": "#17171c",
      "--panel2": "#1e1e25",
      "--accent": "#53d769",
      "--tileRadius": "12px"
    }
  },
  {
    id: "de-la",
    name: "De La Birthday (Gold)",
    vars: {
      "--bg": "#0b0b10",
      "--panel": "#171418",
      "--panel2": "#241c10",
      "--accent": "#f0c23a",
      "--tileRadius": "14px"
    }
  },
  {
    id: "chalk",
    name: "Chalkboard",
    vars: {
      "--bg": "#0b1210",
      "--panel": "#0f1915",
      "--panel2": "#111f19",
      "--accent": "#7ee3c1",
      "--tileRadius": "10px"
    }
  }
];

let state = null;

// ---------- Game setup ----------
function makeDeck(){
  // Standard Rummikub-ish: 1-13, 4 colors, 2 copies each = 104 + 2 jokers
  const colors = ["red","blue","yellow","black"];
  const tiles = [];
  let id = 0;

  for (let copy = 0; copy < 2; copy++){
    for (const c of colors){
      for (let n = 1; n <= 13; n++){
        tiles.push({ id: `t${id++}`, n, c, joker:false });
      }
    }
  }
  tiles.push({ id: `t${id++}`, n:0, c:"black", joker:true });
  tiles.push({ id: `t${id++}`, n:0, c:"black", joker:true });
  return tiles;
}

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function newGame(playerNames = DEFAULT_PLAYERS){
  const deck = shuffle(makeDeck());
  const players = playerNames.map(name => ({
    name,
    rack: []
  }));

  // Deal 14 each (common)
  for (let i = 0; i < 14; i++){
    for (const p of players){
      p.rack.push(deck.pop());
    }
  }

  state = {
    v: "0.1",
    themeId: "classic",
    players,
    current: 0,
    pile: deck,
    table: [],      // flat list for v0.1
    selected: null, // { area: "rack"|"table", tileId }
    passOverlay: true
  };

  saveState();
  applyTheme(state.themeId);
  showPassOverlay(true);
  renderAll();
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

// ---------- Themes ----------
function applyTheme(themeId){
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  state.themeId = theme.id;

  for (const [k,v] of Object.entries(theme.vars)){
    document.documentElement.style.setProperty(k, v);
  }
  const sel = document.getElementById("themeSelect");
  if (sel && sel.value !== theme.id) sel.value = theme.id;

  saveState();
}

// ---------- UI helpers ----------
function tileLabel(tile){
  return tile.joker ? "J" : String(tile.n);
}
function tileSub(tile){
  return tile.joker ? "joker" : tile.c;
}

function getCurrentPlayer(){
  return state.players[state.current];
}

function findTile(area, tileId){
  if (area === "rack"){
    const p = getCurrentPlayer();
    return p.rack.find(t => t.id === tileId) || null;
  }
  if (area === "table"){
    return state.table.find(t => t.id === tileId) || null;
  }
  return null;
}

function removeTile(area, tileId){
  if (area === "rack"){
    const p = getCurrentPlayer();
    const idx = p.rack.findIndex(t => t.id === tileId);
    if (idx >= 0) return p.rack.splice(idx,1)[0];
  }
  if (area === "table"){
    const idx = state.table.findIndex(t => t.id === tileId);
    if (idx >= 0) return state.table.splice(idx,1)[0];
  }
  return null;
}

function clearSelection(){
  state.selected = null;
  saveState();
  renderAll();
}

function selectTile(area, tileId){
  const exists = findTile(area, tileId);
  if (!exists) return;

  // toggle
  if (state.selected && state.selected.area === area && state.selected.tileId === tileId){
    clearSelection();
    return;
  }

  state.selected = { area, tileId };
  saveState();
  renderAll();
}

// Move selected tile to destination area
function moveSelectedTo(destArea){
  if (!state.selected) return;
  const { area, tileId } = state.selected;
  if (area === destArea) return;

  const tile = removeTile(area, tileId);
  if (!tile) return;

  if (destArea === "rack"){
    getCurrentPlayer().rack.push(tile);
    sortRack(getCurrentPlayer().rack);
  } else if (destArea === "table"){
    state.table.push(tile);
  }

  state.selected = null;
  saveState();
  renderAll();
}

function sortRack(rack){
  const order = { red:0, blue:1, yellow:2, black:3 };
  rack.sort((a,b) => {
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;
    if (a.c !== b.c) return (order[a.c] ?? 9) - (order[b.c] ?? 9);
    return (a.n ?? 0) - (b.n ?? 0);
  });
}

// ---------- Turn flow ----------
function showPassOverlay(on){
  const overlay = document.getElementById("passOverlay");
  overlay.classList.toggle("hidden", !on);
  state.passOverlay = on;
  saveState();

  const next = getCurrentPlayer().name;
  document.getElementById("nextPlayerLabel").textContent = next;
}

function nextTurn(){
  state.current = (state.current + 1) % state.players.length;
  state.selected = null;
  saveState();
  showPassOverlay(true);
  renderAll();
}

function drawTile(){
  if (state.pile.length === 0){
    flashHint("No tiles left in the pile.");
    return;
  }
  const t = state.pile.pop();
  getCurrentPlayer().rack.push(t);
  sortRack(getCurrentPlayer().rack);
  saveState();
  renderAll();
}

function flashHint(msg){
  const el = document.getElementById("hint");
  const old = el.textContent;
  el.textContent = msg;
  el.style.opacity = "1";
  setTimeout(() => { el.textContent = old; }, 1400);
}

// ---------- Render ----------
function renderAll(){
  // labels
  document.getElementById("turnLabel").textContent = getCurrentPlayer().name;
  document.getElementById("pileCount").textContent = String(state.pile.length);
  document.getElementById("rackTitle").textContent = `${getCurrentPlayer().name} Rack`;

  // rack
  const rackArea = document.getElementById("rackArea");
  rackArea.innerHTML = "";
  const rack = getCurrentPlayer().rack;
  for (const tile of rack){
    rackArea.appendChild(renderTile("rack", tile));
  }

  // table
  const tableArea = document.getElementById("tableArea");
  tableArea.innerHTML = "";
  for (const tile of state.table){
    tableArea.appendChild(renderTile("table", tile));
  }
}

function renderTile(area, tile){
  const div = document.createElement("div");
  div.className = `tile ${tile.c} ${tile.joker ? "joker" : ""}`;
  if (state.selected && state.selected.area === area && state.selected.tileId === tile.id){
    div.classList.add("selected");
  }
  div.setAttribute("role","button");
  div.setAttribute("aria-label", `${area} tile ${tileLabel(tile)} ${tileSub(tile)}`);

  const num = document.createElement("div");
  num.className = "num";
  num.textContent = tileLabel(tile);

  const sub = document.createElement("div");
  sub.className = "sub";
  sub.textContent = tileSub(tile);

  div.appendChild(num);
  div.appendChild(sub);

  div.addEventListener("click", () => selectTile(area, tile.id));
  return div;
}

// ---------- Export/Import ----------
function exportState(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `racktiles_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importStateFromFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(String(reader.result));
      state = obj;
      applyTheme(state.themeId || "classic");
      saveState();
      showPassOverlay(true);
      renderAll();
    }catch{
      alert("Import failed: invalid JSON.");
    }
  };
  reader.readAsText(file);
}

// ---------- Init ----------
function initThemeSelect(){
  const sel = document.getElementById("themeSelect");
  sel.innerHTML = "";
  for (const t of THEMES){
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => applyTheme(sel.value));
}

function registerServiceWorker(){
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function promptNewGame(){
  // quick and simple: 2-4 players
  let count = Number(prompt("How many players? (2-4)", "2"));
  if (!Number.isFinite(count) || count < 2) count = 2;
  if (count > 4) count = 4;

  const names = [];
  for (let i = 0; i < count; i++){
    const n = prompt(`Player ${i+1} name`, `Player ${i+1}`) || `Player ${i+1}`;
    names.push(n.trim().slice(0, 20));
  }
  newGame(names);
}

window.addEventListener("DOMContentLoaded", () => {
  initThemeSelect();
  registerServiceWorker();

  // load or new
  state = loadState();
  if (!state){
    newGame(DEFAULT_PLAYERS);
  }else{
    applyTheme(state.themeId || "classic");
    showPassOverlay(true);
    renderAll();
  }

  // buttons
  document.getElementById("drawBtn").addEventListener("click", drawTile);
  document.getElementById("endTurnBtn").addEventListener("click", () => nextTurn());

  document.getElementById("clearSelectionBtn").addEventListener("click", clearSelection);
  document.getElementById("sendToTableBtn").addEventListener("click", () => moveSelectedTo("table"));
  document.getElementById("takeBackBtn").addEventListener("click", () => moveSelectedTo("rack"));

  document.getElementById("revealBtn").addEventListener("click", () => showPassOverlay(false));

  document.getElementById("newGameBtn").addEventListener("click", promptNewGame);

  document.getElementById("exportBtn").addEventListener("click", exportState);
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importStateFromFile(f);
    e.target.value = "";
  });

  // Tap destinations: if a tile is selected, tapping the empty rack/table area moves it
  document.getElementById("rackArea").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) moveSelectedTo("rack");
  });
  document.getElementById("tableArea").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) moveSelectedTo("table");
  });
});
