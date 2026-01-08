/* DeLa v0.2 - pass-and-play racks + meld rows + validation + opening 30 */

const STORAGE_KEY = "dela_state_v02";
const DEFAULT_PLAYERS = ["Player 1", "Player 2"];

const THEMES = [
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

// ---------- Deck ----------
function makeDeck(){
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

// ---------- State ----------
function newGame(playerNames = DEFAULT_PLAYERS){
  const deck = shuffle(makeDeck());
  const players = playerNames.map(name => ({ name, rack: [] }));

  for (let i = 0; i < 14; i++){
    for (const p of players){
      p.rack.push(deck.pop());
    }
  }

  state = {
    v: "0.2",
    themeId: "de-la",
    players,
    current: 0,
    pile: deck,
    table: [], // melds: [{id, tiles:[]}]
    hasOpened: Array(playerNames.length).fill(false),
    activeMeldId: null,
    selected: null, // { area: "rack"|"meld", meldId?:string, tileId:string }
    passOverlay: true
  };

  sortRack(getCurrentPlayer().rack);
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

// ---------- Helpers ----------
function tileLabel(tile){ return tile.joker ? "J" : String(tile.n); }
function tileSub(tile){ return tile.joker ? "joker" : tile.c; }
function getCurrentPlayer(){ return state.players[state.current]; }

function sortRack(rack){
  const order = { red:0, blue:1, yellow:2, black:3 };
  rack.sort((a,b) => {
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;
    if (a.c !== b.c) return (order[a.c] ?? 9) - (order[b.c] ?? 9);
    return (a.n ?? 0) - (b.n ?? 0);
  });
}

function flashHint(msg){
  const el = document.getElementById("hint");
  const old = el.textContent;
  el.textContent = msg;
  setTimeout(() => { el.textContent = old; }, 1600);
}

function getActiveMeld(){
  if (!state.activeMeldId) return null;
  return state.table.find(m => m.id === state.activeMeldId) || null;
}

function setActiveMeld(meldId){
  state.activeMeldId = meldId;
  saveState();
  renderAll();
}

// ---------- Selection ----------
function clearSelection(){
  state.selected = null;
  saveState();
  renderAll();
}

function selectTileFromRack(tileId){
  const p = getCurrentPlayer();
  if (!p.rack.some(t => t.id === tileId)) return;

  if (state.selected && state.selected.area === "rack" && state.selected.tileId === tileId){
    clearSelection();
    return;
  }

  state.selected = { area:"rack", tileId };
  saveState();
  renderAll();
}

function selectTileFromMeld(meldId, tileId){
  const meld = state.table.find(m => m.id === meldId);
  if (!meld) return;
  if (!meld.tiles.some(t => t.id === tileId)) return;

  if (state.selected && state.selected.area === "meld" && state.selected.meldId === meldId && state.selected.tileId === tileId){
    clearSelection();
    return;
  }

  state.selected = { area:"meld", meldId, tileId };
  saveState();
  renderAll();
}

function removeSelectedTile(){
  if (!state.selected) return null;

  const p = getCurrentPlayer();
  if (state.selected.area === "rack"){
    const idx = p.rack.findIndex(t => t.id === state.selected.tileId);
    if (idx >= 0) return p.rack.splice(idx,1)[0];
    return null;
  }

  if (state.selected.area === "meld"){
    const meld = state.table.find(m => m.id === state.selected.meldId);
    if (!meld) return null;
    const idx = meld.tiles.findIndex(t => t.id === state.selected.tileId);
    if (idx >= 0) return meld.tiles.splice(idx,1)[0];
    return null;
  }

  return null;
}

function cleanupEmptyMelds(){
  state.table = state.table.filter(m => m.tiles.length > 0);
  if (state.activeMeldId && !state.table.some(m => m.id === state.activeMeldId)){
    state.activeMeldId = state.table[0]?.id || null;
  }
}

// ---------- Meld actions ----------
function newMeld(){
  const id = `m${Date.now()}_${Math.floor(Math.random()*1000)}`;
  state.table.push({ id, tiles: [] });
  state.activeMeldId = id;
  saveState();
  renderAll();
}

function placeSelectedIntoMeld(meldId){
  if (!state.selected) return;

  const tile = removeSelectedTile();
  if (!tile) return;

  const meld = state.table.find(m => m.id === meldId);
  if (!meld){
    // if target meld missing, create one and use it
    state.table.push({ id: meldId, tiles: [] });
  }

  const target = state.table.find(m => m.id === meldId);
  target.tiles.push(tile);

  cleanupEmptyMelds();
  state.selected = null;
  saveState();
  renderAll();
}

function takeSelectedBackToRack(){
  if (!state.selected) return;

  const tile = removeSelectedTile();
  if (!tile) return;

  getCurrentPlayer().rack.push(tile);
  sortRack(getCurrentPlayer().rack);

  cleanupEmptyMelds();
  state.selected = null;
  saveState();
  renderAll();
}

// ---------- Validation (Rummikub-ish) ----------
function validateMeld(meld){
  const tiles = meld.tiles;
  if (tiles.length < 3) return false;

  const nonJokers = tiles.filter(t => !t.joker);
  if (nonJokers.length === 0) return true;

  const nums = nonJokers.map(t => t.n);
  const colors = nonJokers.map(t => t.c);

  // SET: same number, all colors unique, len 3-4
  const allSameNumber = nums.every(n => n === nums[0]);
  if (allSameNumber){
    const uniqueColors = new Set(colors).size === colors.length;
    return uniqueColors && tiles.length <= 4;
  }

  // RUN: same color, consecutive with jokers filling gaps
  const allSameColor = colors.every(c => c === colors[0]);
  if (!allSameColor) return false;

  const sorted = [...nonJokers].sort((a,b) => a.n - b.n);

  // no duplicate numbers in a run
  for (let i = 1; i < sorted.length; i++){
    if (sorted[i].n === sorted[i-1].n) return false;
  }

  let gaps = 0;
  for (let i = 1; i < sorted.length; i++){
    gaps += (sorted[i].n - sorted[i-1].n - 1);
  }

  const jokers = tiles.filter(t => t.joker).length;
  return gaps <= jokers;
}

function tableIsValid(){
  // All melds must be valid. Empty table is valid.
  return state.table.every(validateMeld);
}

function meldValue(meld){
  return meld.tiles
    .filter(t => !t.joker)
    .reduce((s,t) => s + t.n, 0);
}

function meetsOpeningRequirement(){
  const total = state.table.reduce((s,m) => s + meldValue(m), 0);
  return total >= 30;
}

// ---------- Turns ----------
function showPassOverlay(on){
  const overlay = document.getElementById("passOverlay");
  overlay.classList.toggle("hidden", !on);
  state.passOverlay = on;
  saveState();

  document.getElementById("nextPlayerLabel").textContent = getCurrentPlayer().name;
}

function nextTurn(){
  state.current = (state.current + 1) % state.players.length;
  state.selected = null;

  // Keep active meld, but if none, select first
  if (!state.activeMeldId) state.activeMeldId = state.table[0]?.id || null;

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

function endTurn(){
  const playerIndex = state.current;

  cleanupEmptyMelds();

  if (!tableIsValid()){
    flashHint("Fix invalid melds before ending turn.");
    renderAll();
    return;
  }

  if (!state.hasOpened[playerIndex]){
    if (state.table.length === 0){
      flashHint("You must open with melds totaling 30.");
      return;
    }
    if (!meetsOpeningRequirement()){
      flashHint("Opening meld must total 30 points.");
      return;
    }
    state.hasOpened[playerIndex] = true;
  }

  // Win check
  if (getCurrentPlayer().rack.length === 0){
    flashHint(`${getCurrentPlayer().name} wins!`);
    // Keep game state for bragging rights
    saveState();
    renderAll();
    return;
  }

  saveState();
  nextTurn();
}

// ---------- Render ----------
function renderTile(tile, selected){
  const div = document.createElement("div");
  div.className = `tile ${tile.c} ${tile.joker ? "joker" : ""}`;
  if (selected) div.classList.add("selected");

  const num = document.createElement("div");
  num.className = "num";
  num.textContent = tileLabel(tile);

  const sub = document.createElement("div");
  sub.className = "sub";
  sub.textContent = tileSub(tile);

  div.appendChild(num);
  div.appendChild(sub);
  return div;
}

function renderAll(){
  const p = getCurrentPlayer();

  // top labels
  document.getElementById("turnLabel").textContent = p.name;
  document.getElementById("pileCount").textContent = String(state.pile.length);
  document.getElementById("rackTitle").textContent = `${p.name} Rack`;

  const isValid = tableIsValid();
  document.getElementById("tableStatus").textContent = isValid ? "valid" : "invalid";
  document.getElementById("endTurnBtn").disabled = !isValid;

  const opened = state.hasOpened[state.current];
  document.getElementById("openingLabel").textContent = opened ? "done" : "needs 30";

  // rack
  const rackArea = document.getElementById("rackArea");
  rackArea.innerHTML = "";
  for (const tile of p.rack){
    const selected =
      state.selected &&
      state.selected.area === "rack" &&
      state.selected.tileId === tile.id;

    const el = renderTile(tile, selected);
    el.addEventListener("click", () => selectTileFromRack(tile.id));
    rackArea.appendChild(el);
  }

  // table melds
  const tableArea = document.getElementById("tableArea");
  tableArea.innerHTML = "";

  if (state.table.length === 0){
    const empty = document.createElement("div");
    empty.className = "pill";
    empty.textContent = "No melds yet. Tap New Meld, then add tiles.";
    tableArea.appendChild(empty);
  } else {
    for (const meld of state.table){
      const meldWrap = document.createElement("div");
      meldWrap.className = "meld";
      if (meld.id === state.activeMeldId) meldWrap.classList.add("active");

      // This is where the invalid class belongs:
      if (!validateMeld(meld)) meldWrap.classList.add("invalid");

      const header = document.createElement("div");
      header.className = "meldHeader";

      const left = document.createElement("div");
      left.textContent = `Meld (${meld.tiles.length})`;

      const right = document.createElement("button");
      right.className = "btn ghost small";
      right.textContent = "Make Active";
      right.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveMeld(meld.id);
      });

      header.appendChild(left);
      header.appendChild(right);

      const tilesRow = document.createElement("div");
      tilesRow.className = "meldTiles";
      tilesRow.addEventListener("click", () => {
        // If a rack tile is selected, place it into this meld
        if (state.selected && state.selected.area === "rack"){
          placeSelectedIntoMeld(meld.id);
        } else {
          setActiveMeld(meld.id);
        }
      });

      for (const tile of meld.tiles){
        const selected =
          state.selected &&
          state.selected.area === "meld" &&
          state.selected.meldId === meld.id &&
          state.selected.tileId === tile.id;

        const el = renderTile(tile, selected);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          selectTileFromMeld(meld.id, tile.id);
        });
        tilesRow.appendChild(el);
      }

      meldWrap.appendChild(header);
      meldWrap.appendChild(tilesRow);
      tableArea.appendChild(meldWrap);
    }
  }

  // ensure active meld exists if table exists
  if (!state.activeMeldId && state.table.length > 0){
    state.activeMeldId = state.table[0].id;
    saveState();
  }
}

// ---------- Export/Import ----------
function exportState(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dela_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
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
      applyTheme(state.themeId || "de-la");
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

  state = loadState();
  if (!state){
    newGame(DEFAULT_PLAYERS);
  } else {
    // migration-ish safety
    if (!state.v || state.v !== "0.2"){
      newGame(DEFAULT_PLAYERS);
      return;
    }
    applyTheme(state.themeId || "de-la");
    showPassOverlay(true);
    renderAll();
  }

  document.getElementById("drawBtn").addEventListener("click", drawTile);
  document.getElementById("endTurnBtn").addEventListener("click", endTurn);

  document.getElementById("newMeldBtn").addEventListener("click", () => {
    newMeld();
    flashHint("New meld created. Add tiles to it.");
  });

  document.getElementById("clearSelectionBtn").addEventListener("click", clearSelection);
  document.getElementById("takeBackBtn").addEventListener("click", takeSelectedBackToRack);

  document.getElementById("sendToActiveMeldBtn").addEventListener("click", () => {
    const active = getActiveMeld();
    if (!active){
      flashHint("No active meld. Tap New Meld first.");
      return;
    }
    if (!state.selected || state.selected.area !== "rack"){
      flashHint("Select a rack tile first.");
      return;
    }
    placeSelectedIntoMeld(active.id);
  });

  document.getElementById("sortRackBtn").addEventListener("click", () => {
    sortRack(getCurrentPlayer().rack);
    saveState();
    renderAll();
  });

  document.getElementById("revealBtn").addEventListener("click", () => showPassOverlay(false));
  document.getElementById("newGameBtn").addEventListener("click", promptNewGame);

  document.getElementById("exportBtn").addEventListener("click", exportState);
  document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  document.getElementById("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importStateFromFile(f);
    e.target.value = "";
  });
});
