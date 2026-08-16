const STORAGE_KEY = "backrechner:v2";
const LEGACY_STORAGE_KEY = "tortenboden-rechner:v1";
const INVENTORY_STORAGE_KEY = "backrechner:inventory:v1";
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

const defaultInventory = [
  {
    id: uid(),
    qrCode: "00050",
    name: "Salz",
    container: "Bottich 12",
    filledAt: "2026-08-16",
    bestBefore: "2027-08-16",
    shelfLifeDays: 365,
    photos: []
  },
  {
    id: uid(),
    qrCode: "00051",
    name: "Weizenmehl Type 550",
    container: "Bottich 03",
    filledAt: "2026-08-12",
    bestBefore: "2026-11-10",
    shelfLifeDays: 90,
    photos: []
  },
  {
    id: uid(),
    qrCode: "00052",
    name: "Frischhefe",
    container: "Kühlfach 02",
    filledAt: "2026-08-15",
    bestBefore: "2026-08-29",
    shelfLifeDays: 14,
    photos: []
  },
  {
    id: uid(),
    qrCode: "00053",
    name: "Roggensauer Starter",
    container: "Eimer 07",
    filledAt: "2026-08-16",
    bestBefore: "2026-08-19",
    shelfLifeDays: 3,
    photos: []
  }
];

let state = loadState();
let inventory = loadInventory();
let inventoryView = "home";
let activeInventoryStatus = "ok";
let selectedInventoryCode = "00050";
let inventoryStream = null;
let inventoryScanTimer = null;
let inventoryQrStream = null;
let inventoryQrScanTimer = null;
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
  calculatorCards: document.querySelectorAll(".calculator-card[data-mode]"),
  cakeView: document.querySelector("#cakeView"),
  quarkView: document.querySelector("#quarkView"),
  breadView: document.querySelector("#breadView"),
  puddingView: document.querySelector("#puddingView"),
  inventoryView: document.querySelector("#inventoryView"),
  inventoryDashboard: document.querySelector("#inventoryDashboard"),
  inventoryScanPanel: document.querySelector("#inventoryScanPanel"),
  inventoryDetailPanel: document.querySelector("#inventoryDetailPanel"),
  inventoryRefillPanel: document.querySelector("#inventoryRefillPanel"),
  inventoryQrPanel: document.querySelector("#inventoryQrPanel"),
  inventoryPhotosPanel: document.querySelector("#inventoryPhotosPanel"),
  inventoryListPanel: document.querySelector("#inventoryListPanel"),
  inventoryCreatePanel: document.querySelector("#inventoryCreatePanel"),
  inventoryOkCount: document.querySelector("#inventoryOkCount"),
  inventorySoonCount: document.querySelector("#inventorySoonCount"),
  inventoryExpiredCount: document.querySelector("#inventoryExpiredCount"),
  inventoryStatusCards: document.querySelectorAll("[data-inventory-status]"),
  inventoryActionButtons: document.querySelectorAll("[data-inventory-action]"),
  inventoryBackButtons: document.querySelectorAll(".inventory-back"),
  inventoryVideo: document.querySelector("#inventoryVideo"),
  inventoryCameraPlaceholder: document.querySelector("#inventoryCameraPlaceholder"),
  inventoryScanMessage: document.querySelector("#inventoryScanMessage"),
  inventoryCameraButton: document.querySelector("#inventoryCameraButton"),
  inventoryManualCode: document.querySelector("#inventoryManualCode"),
  inventoryManualButton: document.querySelector("#inventoryManualButton"),
  inventoryDetailCard: document.querySelector("#inventoryDetailCard"),
  inventoryDetailQr: document.querySelector("#inventoryDetailQr"),
  inventoryDetailName: document.querySelector("#inventoryDetailName"),
  inventoryDetailFilled: document.querySelector("#inventoryDetailFilled"),
  inventoryDetailBestBefore: document.querySelector("#inventoryDetailBestBefore"),
  inventoryDetailStatus: document.querySelector("#inventoryDetailStatus"),
  inventoryBestBeforeInput: document.querySelector("#inventoryBestBeforeInput"),
  inventoryRefillButton: document.querySelector("#inventoryRefillButton"),
  inventoryRefillQr: document.querySelector("#inventoryRefillQr"),
  inventoryRefillName: document.querySelector("#inventoryRefillName"),
  inventoryRefillMhdInput: document.querySelector("#inventoryRefillMhdInput"),
  inventoryRefillSaveButton: document.querySelector("#inventoryRefillSaveButton"),
  inventoryRefillBackButton: document.querySelector("#inventoryRefillBackButton"),
  inventoryRefillError: document.querySelector("#inventoryRefillError"),
  inventoryPhotosButton: document.querySelector("#inventoryPhotosButton"),
  inventoryChangeQrButton: document.querySelector("#inventoryChangeQrButton"),
  inventoryDeleteButton: document.querySelector("#inventoryDeleteButton"),
  inventoryQrCurrent: document.querySelector("#inventoryQrCurrent"),
  inventoryQrName: document.querySelector("#inventoryQrName"),
  inventoryQrInput: document.querySelector("#inventoryQrInput"),
  inventoryQrCameraBox: document.querySelector("#inventoryQrCameraBox"),
  inventoryQrVideo: document.querySelector("#inventoryQrVideo"),
  inventoryQrCameraPlaceholder: document.querySelector("#inventoryQrCameraPlaceholder"),
  inventoryQrScanMessage: document.querySelector("#inventoryQrScanMessage"),
  inventoryQrCameraButton: document.querySelector("#inventoryQrCameraButton"),
  inventoryQrSaveButton: document.querySelector("#inventoryQrSaveButton"),
  inventoryQrBackButton: document.querySelector("#inventoryQrBackButton"),
  inventoryQrError: document.querySelector("#inventoryQrError"),
  inventoryPhotosBackButton: document.querySelector("#inventoryPhotosBackButton"),
  inventoryPhotosQr: document.querySelector("#inventoryPhotosQr"),
  inventoryPhotoInput: document.querySelector("#inventoryPhotoInput"),
  inventoryPhotoList: document.querySelector("#inventoryPhotoList"),
  inventoryClearPhotosButton: document.querySelector("#inventoryClearPhotosButton"),
  inventoryScanAgainButton: document.querySelector("#inventoryScanAgainButton"),
  inventoryListTitle: document.querySelector("#inventoryListTitle"),
  inventoryListCount: document.querySelector("#inventoryListCount"),
  inventoryList: document.querySelector("#inventoryList"),
  inventoryNewQr: document.querySelector("#inventoryNewQr"),
  inventoryNewName: document.querySelector("#inventoryNewName"),
  inventoryNewMhd: document.querySelector("#inventoryNewMhd"),
  inventoryCreateError: document.querySelector("#inventoryCreateError"),
  inventoryCreateButton: document.querySelector("#inventoryCreateButton"),
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
    activeMode: ["home", "cake", "quark", "bread", "pudding", "inventory"].includes(saved.activeMode) ? saved.activeMode : "home",
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

function loadInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) {
      return saved.map(normalizeInventoryItem);
    }
  } catch {}

  return defaultInventory.map(normalizeInventoryItem);
}

function normalizeInventoryItem(item) {
  return {
    id: item.id || uid(),
    qrCode: normalizeQrCode(item.qrCode || ""),
    name: String(item.name || "Zutat"),
    container: String(item.container || "Bottich"),
    filledAt: String(item.filledAt || isoDate(new Date())),
    bestBefore: String(item.bestBefore || isoDate(addDays(new Date(), 30))),
    shelfLifeDays: toNumber(item.shelfLifeDays) || 30,
    photos: Array.isArray(item.photos) ? item.photos.map(normalizeInventoryPhoto).filter(Boolean) : []
  };
}

function normalizeInventoryPhoto(photo) {
  if (!photo?.dataUrl) return null;
  return {
    id: photo.id || uid(),
    createdAt: String(photo.createdAt || new Date().toISOString()),
    dataUrl: String(photo.dataUrl)
  };
}

function saveInventory() {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
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

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function formatCompactDate(value) {
  const [year, month, day] = String(value).split("-");
  return `${day}${month}${year}`;
}

function parseCompactDate(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return isoDate(date);
}

function daysUntil(value) {
  const today = new Date();
  const target = new Date(`${value}T12:00:00`);
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function getInventoryStatus(item) {
  const remaining = daysUntil(item.bestBefore);
  if (remaining < 0) return "expired";
  if (remaining <= 7) return "soon";
  return "ok";
}

function inventoryStatusText(status, item) {
  const remaining = daysUntil(item.bestBefore);
  if (status === "expired") return `abgelaufen seit ${Math.abs(remaining)} Tagen`;
  if (status === "soon") return remaining === 0 ? "heute fällig" : `noch ${remaining} Tage`;
  return `${remaining} Tage haltbar`;
}

function inventoryStatusTitle(status) {
  if (status === "ok") return "In Ordnung";
  if (status === "soon") return "Bald fällig";
  return "Abgelaufen";
}

function normalizeQrCode(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? digits.padStart(5, "0").slice(-5) : "";
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
  const isInventory = state.activeMode === "inventory";

  els.homeView.hidden = !isHome;
  els.cakeView.hidden = !isCake;
  els.quarkView.hidden = !isQuark;
  els.breadView.hidden = !isBread;
  els.puddingView.hidden = !isPudding;
  els.inventoryView.hidden = !isInventory;
  els.homeButton.hidden = isHome;

  if (isCake) {
    els.appTitle.textContent = "Tortenboden Rechner";
  } else if (isQuark) {
    els.appTitle.textContent = "Quarkbällchen Rechner";
  } else if (isBread) {
    els.appTitle.textContent = "Rosinenbrot Rechner";
  } else if (isPudding) {
    els.appTitle.textContent = "Pudding Rechner";
  } else if (isInventory) {
    els.appTitle.textContent = "Lagerverwaltung";
    renderInventory();
  } else {
    els.appTitle.textContent = "Backstuuv Garrelts";
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

function setInventoryView(view) {
  if (inventoryView === "qr" && view !== "qr") {
    stopInventoryQrCamera();
  }
  inventoryView = view;
  renderInventory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderInventory() {
  if (!els.inventoryView) return;
  const isHome = inventoryView === "home";
  const isScan = inventoryView === "scan";
  const isDetail = inventoryView === "detail";
  const isRefill = inventoryView === "refill";
  const isQr = inventoryView === "qr";
  const isPhotos = inventoryView === "photos";
  const isList = inventoryView === "list";
  const isCreate = inventoryView === "create";

  els.inventoryDashboard.hidden = !isHome;
  els.inventoryScanPanel.hidden = !isScan;
  els.inventoryDetailPanel.hidden = !isDetail;
  els.inventoryRefillPanel.hidden = !isRefill;
  els.inventoryQrPanel.hidden = !isQr;
  els.inventoryPhotosPanel.hidden = !isPhotos;
  els.inventoryListPanel.hidden = !isList;
  els.inventoryCreatePanel.hidden = !isCreate;

  renderInventoryCounts();
  if (isDetail) renderInventoryDetail();
  if (isRefill) renderInventoryRefill();
  if (isQr) renderInventoryQr();
  if (isPhotos) renderInventoryPhotosView();
  if (isList) renderInventoryList();
  if (isCreate) renderInventoryCreate();
}

function renderInventoryCounts() {
  const counts = inventory.reduce(
    (result, item) => {
      result[getInventoryStatus(item)] += 1;
      return result;
    },
    { ok: 0, soon: 0, expired: 0 }
  );

  els.inventoryOkCount.textContent = counts.ok;
  els.inventorySoonCount.textContent = counts.soon;
  els.inventoryExpiredCount.textContent = counts.expired;
}

function renderInventoryDetail() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode) || inventory[0];
  if (!item) return;
  const status = getInventoryStatus(item);
  selectedInventoryCode = item.qrCode;
  els.inventoryDetailCard.className = `inventory-detail-card ${status}`;
  els.inventoryDetailQr.textContent = `QR ${item.qrCode}`;
  els.inventoryDetailName.textContent = item.name;
  els.inventoryDetailFilled.textContent = formatDate(item.filledAt);
  els.inventoryDetailBestBefore.textContent = formatDate(item.bestBefore);
  els.inventoryDetailStatus.textContent = inventoryStatusText(status, item);
  els.inventoryBestBeforeInput.value = item.bestBefore;
}

function renderInventoryPhotosView() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode) || inventory[0];
  if (!item) return;
  selectedInventoryCode = item.qrCode;
  els.inventoryPhotosQr.textContent = `QR ${item.qrCode}`;
  renderInventoryPhotos(item);
}

function renderInventoryRefill() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode) || inventory[0];
  if (!item) return;
  selectedInventoryCode = item.qrCode;
  els.inventoryRefillQr.textContent = `QR ${item.qrCode}`;
  els.inventoryRefillName.textContent = item.name;
  els.inventoryRefillMhdInput.value = formatCompactDate(item.bestBefore);
  els.inventoryRefillError.hidden = true;
  setTimeout(() => {
    els.inventoryRefillMhdInput.focus();
    els.inventoryRefillMhdInput.select();
  }, 0);
}

function renderInventoryQr() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode) || inventory[0];
  if (!item) return;
  selectedInventoryCode = item.qrCode;
  els.inventoryQrCurrent.textContent = `QR ${item.qrCode}`;
  els.inventoryQrName.textContent = item.name;
  els.inventoryQrInput.value = item.qrCode;
  els.inventoryQrError.hidden = true;
  setTimeout(() => {
    els.inventoryQrInput.focus();
    els.inventoryQrInput.select();
  }, 0);
}

function renderInventoryPhotos(item) {
  els.inventoryPhotoList.innerHTML = "";
  els.inventoryClearPhotosButton.hidden = item.photos.length === 0;

  if (!item.photos.length) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = "Noch kein Chargenfoto gespeichert.";
    els.inventoryPhotoList.append(empty);
    return;
  }

  item.photos.forEach((photo) => {
    const card = document.createElement("article");
    const image = document.createElement("img");
    const meta = document.createElement("div");
    const date = document.createElement("span");
    const remove = document.createElement("button");

    card.className = "inventory-photo-card";
    image.src = photo.dataUrl;
    image.alt = "Chargenfoto";
    date.textContent = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(photo.createdAt));
    remove.type = "button";
    remove.className = "back-button";
    remove.dataset.photoId = photo.id;
    remove.textContent = "Löschen";
    meta.append(date, remove);
    card.append(image, meta);
    els.inventoryPhotoList.append(card);
  });
}

function renderInventoryList() {
  const items = inventory.filter((item) => getInventoryStatus(item) === activeInventoryStatus);
  els.inventoryListTitle.textContent = inventoryStatusTitle(activeInventoryStatus);
  els.inventoryListCount.textContent = `${items.length} Einträge`;
  els.inventoryList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = "Keine Zutaten in diesem Bereich.";
    els.inventoryList.append(empty);
    return;
  }

  items.forEach((item) => {
    const status = getInventoryStatus(item);
    const button = document.createElement("button");
    button.className = `inventory-row ${status}`;
    button.type = "button";
    button.dataset.qrCode = item.qrCode;
    const text = document.createElement("span");
    const name = document.createElement("strong");
    const meta = document.createElement("small");
    const statusText = document.createElement("em");
    name.textContent = item.name;
    meta.textContent = `QR ${item.qrCode}`;
    statusText.textContent = inventoryStatusText(status, item);
    text.append(name, meta);
    button.append(text, statusText);
    els.inventoryList.append(button);
  });
}

function renderInventoryCreate() {
  setTimeout(() => {
    const target = els.inventoryNewName.value ? els.inventoryNewMhd : els.inventoryNewName;
    target.focus();
  }, 0);
}

function applyInventoryCode(value) {
  const qrCode = normalizeQrCode(value);
  if (!qrCode) return;
  const item = inventory.find((entry) => entry.qrCode === qrCode);
  selectedInventoryCode = qrCode;
  els.inventoryManualCode.value = qrCode;
  stopInventoryCamera();

  if (item) {
    els.inventoryScanMessage.textContent = `${item.name} gefunden`;
    setInventoryView("detail");
    return;
  }

  els.inventoryScanMessage.textContent = `QR ${qrCode} ist noch frei`;
  els.inventoryNewQr.value = qrCode;
  els.inventoryNewMhd.value = "";
  els.inventoryCreateError.hidden = true;
  setInventoryView("create");
}

async function startInventoryCamera() {
  els.inventoryScanMessage.textContent = "Kamera wird geöffnet ...";
  try {
    inventoryStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    els.inventoryVideo.srcObject = inventoryStream;
    els.inventoryVideo.hidden = false;
    els.inventoryCameraPlaceholder.hidden = true;
    await els.inventoryVideo.play();
    els.inventoryCameraButton.textContent = "Kamera stoppen";

    if (!("BarcodeDetector" in window)) {
      els.inventoryScanMessage.textContent = "QR-Erkennung nicht verfügbar. Code unten eintippen.";
      return;
    }

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    inventoryScanTimer = setInterval(async () => {
      const results = await detector.detect(els.inventoryVideo);
      const code = results[0]?.rawValue;
      if (code) applyInventoryCode(code);
    }, 700);
    els.inventoryScanMessage.textContent = "QR-Code vor die Kamera halten";
  } catch {
    els.inventoryScanMessage.textContent = "Kamera konnte nicht geöffnet werden. Code manuell eingeben.";
    stopInventoryCamera();
  }
}

function stopInventoryCamera() {
  if (inventoryScanTimer) {
    clearInterval(inventoryScanTimer);
    inventoryScanTimer = null;
  }
  if (inventoryStream) {
    inventoryStream.getTracks().forEach((track) => track.stop());
    inventoryStream = null;
  }
  els.inventoryVideo.hidden = true;
  els.inventoryCameraPlaceholder.hidden = false;
  els.inventoryCameraButton.textContent = "Kamera starten";
}

async function startInventoryQrCamera() {
  els.inventoryQrScanMessage.textContent = "Kamera wird geöffnet ...";
  try {
    inventoryQrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    els.inventoryQrCameraBox.hidden = false;
    els.inventoryQrVideo.srcObject = inventoryQrStream;
    els.inventoryQrVideo.hidden = false;
    els.inventoryQrCameraPlaceholder.hidden = true;
    await els.inventoryQrVideo.play();
    els.inventoryQrCameraButton.textContent = "Kamera stoppen";

    if (!("BarcodeDetector" in window)) {
      els.inventoryQrScanMessage.textContent = "QR-Erkennung nicht verfügbar. QR bitte eintippen.";
      return;
    }

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    inventoryQrScanTimer = setInterval(async () => {
      const results = await detector.detect(els.inventoryQrVideo);
      const code = normalizeQrCode(results[0]?.rawValue);
      if (!code) return;
      els.inventoryQrInput.value = code;
      els.inventoryQrError.hidden = true;
      els.inventoryQrScanMessage.textContent = `QR ${code} erkannt`;
      stopInventoryQrCamera();
    }, 700);
    els.inventoryQrScanMessage.textContent = "QR-Code vor die Kamera halten";
  } catch {
    els.inventoryQrScanMessage.textContent = "Kamera konnte nicht geöffnet werden. QR bitte eintippen.";
    stopInventoryQrCamera();
  }
}

function stopInventoryQrCamera() {
  if (inventoryQrScanTimer) {
    clearInterval(inventoryQrScanTimer);
    inventoryQrScanTimer = null;
  }
  if (inventoryQrStream) {
    inventoryQrStream.getTracks().forEach((track) => track.stop());
    inventoryQrStream = null;
  }
  els.inventoryQrCameraBox.hidden = true;
  els.inventoryQrVideo.hidden = true;
  els.inventoryQrCameraPlaceholder.hidden = false;
  els.inventoryQrCameraButton.textContent = "QR scannen";
}

function saveInventoryRefill() {
  const today = new Date();
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item) return;
  const value = els.inventoryRefillMhdInput.value;

  const bestBefore = parseCompactDate(value);
  if (!bestBefore) {
    els.inventoryRefillError.hidden = false;
    els.inventoryRefillMhdInput.focus();
    return;
  }

  if (!confirm(`${item.name} neu befüllt mit MHD ${formatDate(bestBefore)}?`)) return;
  item.filledAt = isoDate(today);
  item.bestBefore = bestBefore;
  saveInventory();
  setInventoryView("detail");
}

function updateInventoryBestBefore(value) {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item) return;
  item.bestBefore = value;
  saveInventory();
  renderInventory();
}

function saveInventoryQrCode() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item) return;
  const qrCode = normalizeQrCode(els.inventoryQrInput.value);
  if (!qrCode) {
    els.inventoryQrError.textContent = "Bitte einen gültigen QR-Code eingeben.";
    els.inventoryQrError.hidden = false;
    els.inventoryQrInput.focus();
    return;
  }
  if (qrCode !== item.qrCode && inventory.some((entry) => entry.qrCode === qrCode)) {
    els.inventoryQrError.textContent = `QR ${qrCode} ist bereits vergeben.`;
    els.inventoryQrError.hidden = false;
    els.inventoryQrInput.focus();
    return;
  }

  item.qrCode = qrCode;
  selectedInventoryCode = qrCode;
  saveInventory();
  setInventoryView("detail");
}

function deleteInventoryItem() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item) return;
  const first = confirm(`${item.name} wirklich löschen?`);
  if (!first) return;
  const second = confirm(`Sicher? ${item.name} und alle gespeicherten Fotos werden endgültig gelöscht.`);
  if (!second) return;

  inventory = inventory.filter((entry) => entry.id !== item.id);
  selectedInventoryCode = inventory[0]?.qrCode || "";
  saveInventory();
  setInventoryView("home");
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = dataUrl;
  });
}

async function resizePhoto(file) {
  const dataUrl = await readImageFile(file);
  const image = await loadImage(dataUrl);
  const maxSize = 1280;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function addInventoryPhoto(file) {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item || !file) return;
  const dataUrl = await resizePhoto(file);
  item.photos.unshift({
    id: uid(),
    createdAt: new Date().toISOString(),
    dataUrl
  });
  saveInventory();
  renderInventory();
}

function removeInventoryPhoto(photoId) {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item) return;
  item.photos = item.photos.filter((photo) => photo.id !== photoId);
  saveInventory();
  renderInventory();
}

function clearInventoryPhotos() {
  const item = inventory.find((entry) => entry.qrCode === selectedInventoryCode);
  if (!item || !item.photos.length) return;
  if (!confirm("Fotoprotokoll für diese Zutat löschen?")) return;
  item.photos = [];
  saveInventory();
  renderInventory();
}

function createInventoryItem() {
  const qrCode = normalizeQrCode(els.inventoryNewQr.value);
  const name = els.inventoryNewName.value.trim();
  const bestBefore = parseCompactDate(els.inventoryNewMhd.value);
  if (!qrCode || !name || !bestBefore) {
    els.inventoryCreateError.textContent = "Bitte QR-Code, Zutat und MHD als TTMMJJJJ eintragen.";
    els.inventoryCreateError.hidden = false;
    return;
  }
  if (inventory.some((item) => item.qrCode === qrCode)) {
    els.inventoryCreateError.textContent = `QR ${qrCode} ist bereits vergeben.`;
    els.inventoryCreateError.hidden = false;
    return;
  }

  const today = new Date();
  const item = {
    id: uid(),
    qrCode,
    name,
    container: "",
    filledAt: isoDate(today),
    bestBefore,
    shelfLifeDays: 30,
    photos: []
  };
  inventory.unshift(item);
  selectedInventoryCode = qrCode;
  els.inventoryNewQr.value = "";
  els.inventoryNewName.value = "";
  els.inventoryNewMhd.value = "";
  els.inventoryCreateError.hidden = true;
  saveInventory();
  setInventoryView("detail");
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
els.homeButton.addEventListener("click", () => {
  stopInventoryCamera();
  stopInventoryQrCamera();
  inventoryView = "home";
  setMode("home");
});

els.inventoryStatusCards.forEach((button) => {
  button.addEventListener("click", () => {
    activeInventoryStatus = button.dataset.inventoryStatus;
    setInventoryView("list");
  });
});

els.inventoryActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.inventoryAction;
    if (action === "scan") setInventoryView("scan");
    if (action === "list") {
      activeInventoryStatus = "ok";
      setInventoryView("list");
    }
    if (action === "create") setInventoryView("create");
  });
});

els.inventoryBackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    stopInventoryCamera();
    setInventoryView("home");
  });
});

els.inventoryCameraButton.addEventListener("click", () => {
  if (inventoryStream) {
    stopInventoryCamera();
    return;
  }
  startInventoryCamera();
});

els.inventoryManualButton.addEventListener("click", () => applyInventoryCode(els.inventoryManualCode.value));
els.inventoryManualCode.addEventListener("keydown", (event) => {
  if (event.key === "Enter") applyInventoryCode(els.inventoryManualCode.value);
});
els.inventoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-qr-code]");
  if (!button) return;
  selectedInventoryCode = button.dataset.qrCode;
  setInventoryView("detail");
});
els.inventoryRefillButton.addEventListener("click", () => setInventoryView("refill"));
els.inventoryRefillBackButton.addEventListener("click", () => setInventoryView("detail"));
els.inventoryRefillSaveButton.addEventListener("click", saveInventoryRefill);
els.inventoryRefillMhdInput.addEventListener("input", () => {
  els.inventoryRefillMhdInput.value = els.inventoryRefillMhdInput.value.replace(/\D/g, "").slice(0, 8);
  els.inventoryRefillError.hidden = true;
});
els.inventoryRefillMhdInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveInventoryRefill();
});
els.inventoryBestBeforeInput.addEventListener("change", (event) => updateInventoryBestBefore(event.target.value));
els.inventoryPhotosButton.addEventListener("click", () => setInventoryView("photos"));
els.inventoryChangeQrButton.addEventListener("click", () => setInventoryView("qr"));
els.inventoryDeleteButton.addEventListener("click", deleteInventoryItem);
els.inventoryQrBackButton.addEventListener("click", () => setInventoryView("detail"));
els.inventoryQrCameraButton.addEventListener("click", () => {
  if (inventoryQrStream) {
    stopInventoryQrCamera();
    return;
  }
  startInventoryQrCamera();
});
els.inventoryQrSaveButton.addEventListener("click", saveInventoryQrCode);
els.inventoryQrInput.addEventListener("input", () => {
  els.inventoryQrInput.value = els.inventoryQrInput.value.replace(/\D/g, "").slice(0, 5);
  els.inventoryQrError.hidden = true;
});
els.inventoryQrInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveInventoryQrCode();
});
els.inventoryPhotosBackButton.addEventListener("click", () => setInventoryView("detail"));
els.inventoryPhotoInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await addInventoryPhoto(file);
  event.target.value = "";
});
els.inventoryPhotoList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-photo-id]");
  if (!button) return;
  removeInventoryPhoto(button.dataset.photoId);
});
els.inventoryClearPhotosButton.addEventListener("click", clearInventoryPhotos);
els.inventoryScanAgainButton.addEventListener("click", () => setInventoryView("scan"));
els.inventoryNewMhd.addEventListener("input", () => {
  els.inventoryNewMhd.value = els.inventoryNewMhd.value.replace(/\D/g, "").slice(0, 8);
  els.inventoryCreateError.hidden = true;
});
els.inventoryNewMhd.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createInventoryItem();
});
els.inventoryCreateButton.addEventListener("click", createInventoryItem);

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
