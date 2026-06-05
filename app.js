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
  activeMode: "home",
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
  },
  bread: {
    ingredients: {
      starter: 0,
      flour: 0,
      salt: 0,
      yeast: 0,
      starterWater: 0,
      sugar: 0,
      doughWater: 0,
      raisins: 0
    },
    runs: 0,
    loafWeight: 0
  },
  pudding: {
    ingredients: {
      water: 0,
      powder: 0
    },
    targetMass: 0
  }
};

let state = loadState();
let cakeLocked = true;
let quarkLocked = true;
let breadLocked = true;
let puddingLocked = true;

const els = {
  pinGate: document.querySelector("#pinGate"),
  pinForm: document.querySelector("#pinForm"),
  pinInput: document.querySelector("#pinInput"),
  pinError: document.querySelector("#pinError"),
  appTitle: document.querySelector("#appTitle"),
  homeButton: document.querySelector("#homeButton"),
  homeView: document.querySelector("#homeView"),
  calculatorCards: document.querySelectorAll(".calculator-card"),
  cakeView: document.querySelector("#cakeView"),
  quarkView: document.querySelector("#quarkView"),
  breadView: document.querySelector("#breadView"),
  puddingView: document.querySelector("#puddingView"),
  cakeRecipeSection: document.querySelector(".cake-recipe-section"),
  quarkRecipeSection: document.querySelector(".quark-recipe-section"),
  breadRecipeSection: document.querySelector(".bread-recipe-section"),
  puddingRecipeSection: document.querySelector(".pudding-recipe-section"),
  flourInput: document.querySelector("#flourInput"),
  eggsInput: document.querySelector("#eggsInput"),
  waterInput: document.querySelector("#waterInput"),
  baseTotal: document.querySelector("#baseTotal"),
  cakeLockButton: document.querySelector("#cakeLockButton"),
  ringList: document.querySelector("#ringList"),
  addRingButton: document.querySelector("#addRingButton"),
  cakeResetButton: document.querySelector("#cakeResetButton"),
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
  quarkResetButton: document.querySelector("#quarkResetButton"),
  quarkRunsInput: document.querySelector("#quarkRunsInput"),
  quarkRunsLabel: document.querySelector("#quarkRunsLabel"),
  quarkTotalMass: document.querySelector("#quarkTotalMass"),
  quarkFlourTotal: document.querySelector("#quarkFlourTotal"),
  quarkWaterTotal: document.querySelector("#quarkWaterTotal"),
  quarkTotal: document.querySelector("#quarkTotal"),
  breadStarterInput: document.querySelector("#breadStarterInput"),
  breadFlourInput: document.querySelector("#breadFlourInput"),
  breadSaltInput: document.querySelector("#breadSaltInput"),
  breadYeastInput: document.querySelector("#breadYeastInput"),
  breadStarterWaterInput: document.querySelector("#breadStarterWaterInput"),
  breadSugarInput: document.querySelector("#breadSugarInput"),
  breadDoughWaterInput: document.querySelector("#breadDoughWaterInput"),
  breadRaisinsInput: document.querySelector("#breadRaisinsInput"),
  breadBaseTotal: document.querySelector("#breadBaseTotal"),
  breadLockButton: document.querySelector("#breadLockButton"),
  breadResetButton: document.querySelector("#breadResetButton"),
  breadRunsInput: document.querySelector("#breadRunsInput"),
  breadWeightInput: document.querySelector("#breadWeightInput"),
  breadRunsLabel: document.querySelector("#breadRunsLabel"),
  breadTotalMass: document.querySelector("#breadTotalMass"),
  breadStarterTotal: document.querySelector("#breadStarterTotal"),
  breadFlourTotal: document.querySelector("#breadFlourTotal"),
  breadSaltTotal: document.querySelector("#breadSaltTotal"),
  breadYeastTotal: document.querySelector("#breadYeastTotal"),
  breadStarterWaterTotal: document.querySelector("#breadStarterWaterTotal"),
  breadSugarTotal: document.querySelector("#breadSugarTotal"),
  breadDoughWaterTotal: document.querySelector("#breadDoughWaterTotal"),
  breadRaisinsTotal: document.querySelector("#breadRaisinsTotal"),
  puddingWaterInput: document.querySelector("#puddingWaterInput"),
  puddingPowderInput: document.querySelector("#puddingPowderInput"),
  puddingBaseTotal: document.querySelector("#puddingBaseTotal"),
  puddingLockButton: document.querySelector("#puddingLockButton"),
  puddingResetButton: document.querySelector("#puddingResetButton"),
  puddingTargetInput: document.querySelector("#puddingTargetInput"),
  puddingTargetLabel: document.querySelector("#puddingTargetLabel"),
  puddingTotalMass: document.querySelector("#puddingTotalMass"),
  puddingWaterTotal: document.querySelector("#puddingWaterTotal"),
  puddingPowderTotal: document.querySelector("#puddingPowderTotal"),
  puddingRatioWarning: document.querySelector("#puddingRatioWarning")
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
    activeMode: ["home", "cake", "quark", "bread", "pudding"].includes(saved.activeMode) ? saved.activeMode : "home",
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
    },
    bread: {
      ingredients: {
        starter: toNumber(saved.bread?.ingredients?.starter),
        flour: toNumber(saved.bread?.ingredients?.flour),
        salt: toNumber(saved.bread?.ingredients?.salt),
        yeast: toNumber(saved.bread?.ingredients?.yeast),
        starterWater: toNumber(saved.bread?.ingredients?.starterWater),
        sugar: toNumber(saved.bread?.ingredients?.sugar),
        doughWater: toNumber(saved.bread?.ingredients?.doughWater),
        raisins: toNumber(saved.bread?.ingredients?.raisins)
      },
      runs: toNumber(saved.bread?.runs),
      loafWeight: toNumber(saved.bread?.loafWeight)
    },
    pudding: {
      ingredients: {
        water: toNumber(saved.pudding?.ingredients?.water),
        powder: toNumber(saved.pudding?.ingredients?.powder)
      },
      targetMass: toNumber(saved.pudding?.targetMass)
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
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMode() {
  const isHome = state.activeMode === "home";
  const isCake = state.activeMode === "cake";
  const isQuark = state.activeMode === "quark";
  const isBread = state.activeMode === "bread";
  const isPudding = state.activeMode === "pudding";

  els.homeView.hidden = !isHome;
  els.cakeView.hidden = !isCake;
  els.quarkView.hidden = !isQuark;
  els.breadView.hidden = !isBread;
  els.puddingView.hidden = !isPudding;
  els.homeButton.hidden = isHome;

  if (isCake) {
    els.appTitle.textContent = "Tortenboden Rechner";
  } else if (isQuark) {
    els.appTitle.textContent = "Quarkbällchen Rechner";
  } else if (isBread) {
    els.appTitle.textContent = "Rosinenbrot Rechner";
  } else if (isPudding) {
    els.appTitle.textContent = "Pudding Rechner";
  } else {
    els.appTitle.textContent = "Backrechner";
  }
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

function renderBreadIngredients() {
  els.breadStarterInput.value = state.bread.ingredients.starter || "";
  els.breadFlourInput.value = state.bread.ingredients.flour || "";
  els.breadSaltInput.value = state.bread.ingredients.salt || "";
  els.breadYeastInput.value = state.bread.ingredients.yeast || "";
  els.breadStarterWaterInput.value = state.bread.ingredients.starterWater || "";
  els.breadSugarInput.value = state.bread.ingredients.sugar || "";
  els.breadDoughWaterInput.value = state.bread.ingredients.doughWater || "";
  els.breadRaisinsInput.value = state.bread.ingredients.raisins || "";
  els.breadRunsInput.value = state.bread.runs || "";
  els.breadWeightInput.value = state.bread.loafWeight || "";
  renderBreadLock();
}

function renderBreadLock() {
  [
    els.breadStarterInput,
    els.breadFlourInput,
    els.breadSaltInput,
    els.breadYeastInput,
    els.breadStarterWaterInput,
    els.breadSugarInput,
    els.breadDoughWaterInput,
    els.breadRaisinsInput
  ].forEach((input) => {
    input.readOnly = breadLocked;
  });
  els.breadRecipeSection.classList.toggle("is-locked", breadLocked);
  els.breadLockButton.classList.toggle("is-editing", !breadLocked);
  els.breadLockButton.textContent = breadLocked ? "Bearbeiten" : "Sperren";
  els.breadLockButton.setAttribute("aria-pressed", String(breadLocked));
}

function renderPuddingIngredients() {
  els.puddingWaterInput.value = state.pudding.ingredients.water || "";
  els.puddingPowderInput.value = state.pudding.ingredients.powder || "";
  els.puddingTargetInput.value = state.pudding.targetMass || "";
  renderPuddingLock();
}

function renderPuddingLock() {
  [els.puddingWaterInput, els.puddingPowderInput].forEach((input) => {
    input.readOnly = puddingLocked;
  });
  els.puddingRecipeSection.classList.toggle("is-locked", puddingLocked);
  els.puddingLockButton.classList.toggle("is-editing", !puddingLocked);
  els.puddingLockButton.textContent = puddingLocked ? "Bearbeiten" : "Sperren";
  els.puddingLockButton.setAttribute("aria-pressed", String(puddingLocked));
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

function calculateBread() {
  const ingredients = state.bread.ingredients;
  const baseTotal =
    ingredients.starter +
    ingredients.flour +
    ingredients.salt +
    ingredients.yeast +
    ingredients.starterWater +
    ingredients.sugar +
    ingredients.doughWater +
    ingredients.raisins;
  const targetTotal = state.bread.runs * state.bread.loafWeight;
  const factor = baseTotal > 0 ? targetTotal / baseTotal : 0;

  els.breadBaseTotal.value = `${formatGram(baseTotal)} Masse`;
  els.breadRunsLabel.value = formatGram(targetTotal);
  els.breadTotalMass.value = formatGram(targetTotal);
  els.breadStarterTotal.textContent = formatGram(ingredients.starter * factor);
  els.breadFlourTotal.textContent = formatGram(ingredients.flour * factor);
  els.breadSaltTotal.textContent = formatGram(ingredients.salt * factor);
  els.breadYeastTotal.textContent = formatGram(ingredients.yeast * factor);
  els.breadStarterWaterTotal.textContent = formatGram(ingredients.starterWater * factor);
  els.breadSugarTotal.textContent = formatGram(ingredients.sugar * factor);
  els.breadDoughWaterTotal.textContent = formatGram(ingredients.doughWater * factor);
  els.breadRaisinsTotal.textContent = formatGram(ingredients.raisins * factor);
}

function calculatePudding() {
  const { water, powder } = state.pudding.ingredients;
  const baseTotal = water + powder;
  const targetTotal = state.pudding.targetMass;
  const factor = baseTotal > 0 ? targetTotal / baseTotal : 0;

  els.puddingBaseTotal.value = `${formatGram(baseTotal)} Masse`;
  els.puddingTargetLabel.value = formatGram(targetTotal);
  els.puddingTotalMass.value = formatGram(targetTotal);
  els.puddingWaterTotal.textContent = formatGram(water * factor);
  els.puddingPowderTotal.textContent = formatGram(powder * factor);
  els.puddingRatioWarning.hidden = baseTotal > 0 || targetTotal === 0;
}

function calculateAll() {
  calculateCake();
  calculateQuark();
  calculateBread();
  calculatePudding();
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

function syncBreadIngredient(field, value) {
  state.bread.ingredients[field] = toNumber(value);
  saveState();
  calculateBread();
}

function syncPuddingIngredient(field, value) {
  state.pudding.ingredients[field] = toNumber(value);
  saveState();
  calculatePudding();
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

function resetCakeBaseRecipe() {
  const fresh = cloneDefaultState();
  state.cake.ingredients = fresh.cake.ingredients;
  saveState();
  renderCakeIngredients();
  calculateCake();
}

function resetQuarkBaseRecipe() {
  const fresh = cloneDefaultState();
  state.quark.ingredients = fresh.quark.ingredients;
  saveState();
  renderQuarkIngredients();
  calculateQuark();
}

function resetBreadBaseRecipe() {
  const fresh = cloneDefaultState();
  state.bread.ingredients = fresh.bread.ingredients;
  saveState();
  renderBreadIngredients();
  calculateBread();
}

function resetPuddingBaseRecipe() {
  const fresh = cloneDefaultState();
  state.pudding.ingredients = fresh.pudding.ingredients;
  saveState();
  renderPuddingIngredients();
  calculatePudding();
}

function confirmAndResetCakeBaseRecipe() {
  if (!confirm("Grundrezept für Tortenböden wirklich zurücksetzen?")) return;
  resetCakeBaseRecipe();
}

function confirmAndResetQuarkBaseRecipe() {
  if (!confirm("Grundrezept für Quarkbällchen wirklich zurücksetzen?")) return;
  resetQuarkBaseRecipe();
}

function confirmAndResetBreadBaseRecipe() {
  if (!confirm("Grundrezept für Rosinenbrot wirklich zurücksetzen?")) return;
  resetBreadBaseRecipe();
}

function confirmAndResetPuddingBaseRecipe() {
  if (!confirm("Grundrezept für Pudding wirklich zurücksetzen?")) return;
  resetPuddingBaseRecipe();
}

els.calculatorCards.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
els.homeButton.addEventListener("click", () => setMode("home"));

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

els.breadStarterInput.addEventListener("input", (event) => syncBreadIngredient("starter", event.target.value));
els.breadFlourInput.addEventListener("input", (event) => syncBreadIngredient("flour", event.target.value));
els.breadSaltInput.addEventListener("input", (event) => syncBreadIngredient("salt", event.target.value));
els.breadYeastInput.addEventListener("input", (event) => syncBreadIngredient("yeast", event.target.value));
els.breadStarterWaterInput.addEventListener("input", (event) => syncBreadIngredient("starterWater", event.target.value));
els.breadSugarInput.addEventListener("input", (event) => syncBreadIngredient("sugar", event.target.value));
els.breadDoughWaterInput.addEventListener("input", (event) => syncBreadIngredient("doughWater", event.target.value));
els.breadRaisinsInput.addEventListener("input", (event) => syncBreadIngredient("raisins", event.target.value));
els.breadRunsInput.addEventListener("input", (event) => {
  state.bread.runs = toNumber(event.target.value);
  saveState();
  calculateBread();
});
els.breadWeightInput.addEventListener("input", (event) => {
  state.bread.loafWeight = toNumber(event.target.value);
  saveState();
  calculateBread();
});

els.puddingWaterInput.addEventListener("input", (event) => syncPuddingIngredient("water", event.target.value));
els.puddingPowderInput.addEventListener("input", (event) => syncPuddingIngredient("powder", event.target.value));
els.puddingTargetInput.addEventListener("input", (event) => {
  state.pudding.targetMass = toNumber(event.target.value);
  saveState();
  calculatePudding();
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
els.cakeResetButton.addEventListener("click", confirmAndResetCakeBaseRecipe);
els.quarkResetButton.addEventListener("click", confirmAndResetQuarkBaseRecipe);
els.breadResetButton.addEventListener("click", confirmAndResetBreadBaseRecipe);
els.puddingResetButton.addEventListener("click", confirmAndResetPuddingBaseRecipe);
els.cakeLockButton.addEventListener("click", () => {
  cakeLocked = !cakeLocked;
  renderCakeLock();
});
els.quarkLockButton.addEventListener("click", () => {
  quarkLocked = !quarkLocked;
  renderQuarkLock();
});
els.breadLockButton.addEventListener("click", () => {
  breadLocked = !breadLocked;
  renderBreadLock();
});
els.puddingLockButton.addEventListener("click", () => {
  puddingLocked = !puddingLocked;
  renderPuddingLock();
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
renderBreadIngredients();
renderPuddingIngredients();
calculateAll();
lockAppIfNeeded();
