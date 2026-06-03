const STORAGE_KEY = "backrechner:v2";
const LEGACY_STORAGE_KEY = "tortenboden-rechner:v1";
const ACCESS_PIN = "6276";
const UNLOCK_KEY = "tortenboden-rechner:unlocked";

function uid() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultState = {
  activeMode: "cake",
  cake: {
    ingredients: {
      flour: 0,
      eggs: 0,
      water: 0
    },
    rings: [
      { id: uid(), name: "28er Ring", mass: 750, count: 0 },
      { id: uid(), name: "22er Ring", mass: 550, count: 0 },
      { id: uid(), name: "Frei", mass: 0, count: 0 }
    ]
  },
  quark: {
    ingredients: {
      flour: 0,
      water: 0,
      quark: 0
    },
    runs: 0
  }
};

let state = loadState();
let cakeLocked = true;
let quarkLocked = true;

const els = {
  pinGate: document.querySelector("#pinGate"),
  pinForm: document.querySelector("#pinForm"),
  pinInput: document.querySelector("#pinInput"),
  pinError: document.querySelector("#pinError"),
  appTitle: document.querySelector("#appTitle"),
  modeButtons: document.querySelectorAll(".mode-button"),
  cakeView: document.querySelector("#cakeView"),
  quarkView: document.querySelector("#quarkView"),
  cakeRecipeSection: document.querySelector(".cake-recipe-section"),
  quarkRecipeSection: document.querySelector(".quark-recipe-section"),
  flourInput: document.querySelector("#flourInput"),
  eggsInput: document.querySelector("#eggsInput"),
  waterInput: document.querySelector("#waterInput"),
  baseTotal: document.querySelector("#baseTotal"),
  cakeLockButton: document.querySelector("#cakeLockButton"),
  ringList: document.querySelector("#ringList"),
  addRingButton: document.querySelector("#addRingButton"),
  resetButton: document.querySelector("#resetButton"),
  totalMass: document.querySelector("#totalMass"),
  flourTotal: document.querySelector("#flourTotal"),
  eggsTotal: document.querySelector("#eggsTotal"),
  waterTotal: document.querySelector("#waterTotal"),
  ratioWarning: document.querySelector("#ratioWarning"),
  ringTemplate: document.querySelector("#ringTemplate"),
  quarkFlourInput: document.querySelector("#quarkFlourInput"),
  quarkWaterInput: document.querySelector("#quarkWaterInput"),
  quarkInput: document.querySelector("#quarkInput"),
  quarkBaseTotal: document.querySelector("#quarkBaseTotal"),
  quarkLockButton: document.querySelector("#quarkLockButton"),
  quarkRunsInput: document.querySelector("#quarkRunsInput"),
  quarkRunsLabel: document.querySelector("#quarkRunsLabel"),
  quarkTotalMass: document.querySelector("#quarkTotalMass"),
  quarkFlourTotal: document.querySelector("#quarkFlourTotal"),
  quarkWaterTotal: document.querySelector("#quarkWaterTotal"),
  quarkTotal: document.querySelector("#quarkTotal")
};

function unlockApp() {
  sessionStorage.setItem(UNLOCK_KEY, "true");
  document.body.classList.remove("is-locked");
  els.pinGate.hidden = true;
}

function lockAppIfNeeded() {
  if (sessionStorage.getItem(UNLOCK_KEY) === "true") {
    unlockApp();
    return;
  }

  document.body.classList.add("is-locked");
  els.pinGate.hidden = false;
  setTimeout(() => els.pinInput.focus(), 0);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.cake && saved?.quark) {
      return normalizeState(saved);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy?.ingredients && Array.isArray(legacy.rings)) {
      const migrated = cloneDefaultState();
      migrated.cake.ingredients = {
        flour: toNumber(legacy.ingredients.flour),
        eggs: toNumber(legacy.ingredients.eggs),
        water: toNumber(legacy.ingredients.water)
      };
      migrated.cake.rings = legacy.rings.map(normalizeRing);
      return migrated;
    }
  } catch {
    return cloneDefaultState();
  }

  return cloneDefaultState();
}

function normalizeState(saved) {
  const fallback = cloneDefaultState();
  return {
    activeMode: saved.activeMode === "quark" ? "quark" : "cake",
    cake: {
      ingredients: {
        flour: toNumber(saved.cake?.ingredients?.flour),
        eggs: toNumber(saved.cake?.ingredients?.eggs),
        water: toNumber(saved.cake?.ingredients?.water)
      },
      rings: Array.isArray(saved.cake?.rings) ? saved.cake.rings.map(normalizeRing) : fallback.cake.rings
    },
    quark: {
      ingredients: {
        flour: toNumber(saved.quark?.ingredients?.flour),
        water: toNumber(saved.quark?.ingredients?.water),
        quark: toNumber(saved.quark?.ingredients?.quark)
      },
      runs: toNumber(saved.quark?.runs)
    }
  };
}

function normalizeRing(ring) {
  return {
    id: ring.id || uid(),
    name: String(ring.name || "Größe"),
    mass: toNumber(ring.mass),
    count: toNumber(ring.count)
  };
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function formatGram(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("de-DE", { maximumFractionDigits: 1 })} g`;
}

function setMode(mode) {
  state.activeMode = mode;
  saveState();
  renderMode();
}

function renderMode() {
  const isCake = state.activeMode === "cake";
  els.cakeView.hidden = !isCake;
  els.quarkView.hidden = isCake;
  els.appTitle.textContent = isCake ? "Tortenboden Rechner" : "Quarkbällchen Rechner";
  els.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.activeMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function renderCakeIngredients() {
  els.flourInput.value = state.cake.ingredients.flour || "";
  els.eggsInput.value = state.cake.ingredients.eggs || "";
  els.waterInput.value = state.cake.ingredients.water || "";
  renderCakeLock();
}

function renderCakeLock() {
  [els.flourInput, els.eggsInput, els.waterInput].forEach((input) => {
    input.readOnly = cakeLocked;
  });
  els.cakeRecipeSection.classList.toggle("is-locked", cakeLocked);
  els.cakeLockButton.classList.toggle("is-editing", !cakeLocked);
  els.cakeLockButton.textContent = cakeLocked ? "Bearbeiten" : "Sperren";
  els.cakeLockButton.setAttribute("aria-pressed", String(cakeLocked));
}

function renderRings() {
  els.ringList.innerHTML = "";

  state.cake.rings.forEach((ring) => {
    const row = els.ringTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = ring.id;
    row.querySelector('[data-field="name"]').value = ring.name;
    row.querySelector('[data-field="mass"]').value = ring.mass || "";
    row.querySelector('[data-field="count"]').value = ring.count || "";
    els.ringList.append(row);
  });
}

function renderQuarkIngredients() {
  els.quarkFlourInput.value = state.quark.ingredients.flour || "";
  els.quarkWaterInput.value = state.quark.ingredients.water || "";
  els.quarkInput.value = state.quark.ingredients.quark || "";
  els.quarkRunsInput.value = state.quark.runs || "";
  renderQuarkLock();
}

function renderQuarkLock() {
  [els.quarkFlourInput, els.quarkWaterInput, els.quarkInput].forEach((input) => {
    input.readOnly = quarkLocked;
  });
  els.quarkRecipeSection.classList.toggle("is-locked", quarkLocked);
  els.quarkLockButton.classList.toggle("is-editing", !quarkLocked);
  els.quarkLockButton.textContent = quarkLocked ? "Bearbeiten" : "Sperren";
  els.quarkLockButton.setAttribute("aria-pressed", String(quarkLocked));
}

function calculateCake() {
  const { flour, eggs, water } = state.cake.ingredients;
  const baseTotal = flour + eggs + water;
  const targetTotal = state.cake.rings.reduce((sum, ring) => sum + ring.mass * ring.count, 0);
  const factor = baseTotal > 0 ? targetTotal / baseTotal : 0;

  els.baseTotal.value = `${formatGram(baseTotal)} Masse`;
  els.totalMass.value = formatGram(targetTotal);
  els.flourTotal.textContent = formatGram(flour * factor);
  els.eggsTotal.textContent = formatGram(eggs * factor);
  els.waterTotal.textContent = formatGram(water * factor);
  els.ratioWarning.hidden = baseTotal > 0 || targetTotal === 0;
}

function calculateQuark() {
  const { flour, water, quark } = state.quark.ingredients;
  const baseTotal = flour + water + quark;
  const runs = state.quark.runs;
  const totalMass = baseTotal * runs;

  els.quarkBaseTotal.value = `${formatGram(baseTotal)} Masse`;
  els.quarkRunsLabel.value = `${runs.toLocaleString("de-DE", { maximumFractionDigits: 0 })}× Rezept`;
  els.quarkTotalMass.value = formatGram(totalMass);
  els.quarkFlourTotal.textContent = formatGram(flour * runs);
  els.quarkWaterTotal.textContent = formatGram(water * runs);
  els.quarkTotal.textContent = formatGram(quark * runs);
}

function calculateAll() {
  calculateCake();
  calculateQuark();
}

function syncCakeIngredient(field, value) {
  state.cake.ingredients[field] = toNumber(value);
  saveState();
  calculateCake();
}

function syncQuarkIngredient(field, value) {
  state.quark.ingredients[field] = toNumber(value);
  saveState();
  calculateQuark();
}

function updateRing(id, field, value) {
  const ring = state.cake.rings.find((item) => item.id === id);
  if (!ring) return;
  ring[field] = field === "name" ? value : toNumber(value);
  saveState();
  calculateCake();
}

function addRing() {
  state.cake.rings.push({
    id: uid(),
    name: "Neue Größe",
    mass: 0,
    count: 0
  });
  saveState();
  renderRings();
  calculateCake();
}

function removeRing(id) {
  state.cake.rings = state.cake.rings.filter((ring) => ring.id !== id);
  saveState();
  renderRings();
  calculateCake();
}

function resetCurrentRecipe() {
  const fresh = cloneDefaultState();
  if (state.activeMode === "cake") {
    state.cake = fresh.cake;
    renderCakeIngredients();
    renderRings();
    calculateCake();
  } else {
    state.quark = fresh.quark;
    renderQuarkIngredients();
    calculateQuark();
  }
  saveState();
}

els.modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

els.flourInput.addEventListener("input", (event) => syncCakeIngredient("flour", event.target.value));
els.eggsInput.addEventListener("input", (event) => syncCakeIngredient("eggs", event.target.value));
els.waterInput.addEventListener("input", (event) => syncCakeIngredient("water", event.target.value));

els.quarkFlourInput.addEventListener("input", (event) => syncQuarkIngredient("flour", event.target.value));
els.quarkWaterInput.addEventListener("input", (event) => syncQuarkIngredient("water", event.target.value));
els.quarkInput.addEventListener("input", (event) => syncQuarkIngredient("quark", event.target.value));
els.quarkRunsInput.addEventListener("input", (event) => {
  state.quark.runs = toNumber(event.target.value);
  saveState();
  calculateQuark();
});

els.ringList.addEventListener("input", (event) => {
  const row = event.target.closest(".ring-row");
  if (!row || !event.target.dataset.field) return;
  updateRing(row.dataset.id, event.target.dataset.field, event.target.value);
});

els.ringList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='remove']");
  if (!button) return;
  removeRing(button.closest(".ring-row").dataset.id);
});

els.addRingButton.addEventListener("click", addRing);
els.resetButton.addEventListener("click", resetCurrentRecipe);
els.cakeLockButton.addEventListener("click", () => {
  cakeLocked = !cakeLocked;
  renderCakeLock();
});
els.quarkLockButton.addEventListener("click", () => {
  quarkLocked = !quarkLocked;
  renderQuarkLock();
});
els.pinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (els.pinInput.value === ACCESS_PIN) {
    els.pinInput.value = "";
    els.pinError.hidden = true;
    unlockApp();
    return;
  }

  els.pinError.hidden = false;
  els.pinInput.select();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

renderMode();
renderCakeIngredients();
renderRings();
renderQuarkIngredients();
calculateAll();
lockAppIfNeeded();
