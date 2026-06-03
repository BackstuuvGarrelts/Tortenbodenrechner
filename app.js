const STORAGE_KEY = "tortenboden-rechner:v1";

function uid() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultState = {
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
};

let state = loadState();
let recipeLocked = true;

const els = {
  recipeSection: document.querySelector(".recipe-section"),
  flourInput: document.querySelector("#flourInput"),
  eggsInput: document.querySelector("#eggsInput"),
  waterInput: document.querySelector("#waterInput"),
  baseTotal: document.querySelector("#baseTotal"),
  recipeLockButton: document.querySelector("#recipeLockButton"),
  ringList: document.querySelector("#ringList"),
  addRingButton: document.querySelector("#addRingButton"),
  resetButton: document.querySelector("#resetButton"),
  totalMass: document.querySelector("#totalMass"),
  flourTotal: document.querySelector("#flourTotal"),
  eggsTotal: document.querySelector("#eggsTotal"),
  waterTotal: document.querySelector("#waterTotal"),
  ratioWarning: document.querySelector("#ratioWarning"),
  ringTemplate: document.querySelector("#ringTemplate")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.ingredients || !Array.isArray(saved.rings)) {
      return cloneDefaultState();
    }

    return {
      ingredients: {
        flour: toNumber(saved.ingredients.flour),
        eggs: toNumber(saved.ingredients.eggs),
        water: toNumber(saved.ingredients.water)
      },
      rings: saved.rings.map((ring) => ({
        id: ring.id || uid(),
        name: String(ring.name || "Größe"),
        mass: toNumber(ring.mass),
        count: toNumber(ring.count)
      }))
    };
  } catch {
    return cloneDefaultState();
  }
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toNumber(value) {
  const normalized = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function formatGram(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("de-DE", { maximumFractionDigits: 1 })} g`;
}

function renderIngredients() {
  els.flourInput.value = state.ingredients.flour || "";
  els.eggsInput.value = state.ingredients.eggs || "";
  els.waterInput.value = state.ingredients.water || "";
  renderRecipeLock();
}

function renderRecipeLock() {
  const inputs = [els.flourInput, els.eggsInput, els.waterInput];
  inputs.forEach((input) => {
    input.readOnly = recipeLocked;
  });
  els.recipeSection.classList.toggle("is-locked", recipeLocked);
  els.recipeLockButton.classList.toggle("is-editing", !recipeLocked);
  els.recipeLockButton.textContent = recipeLocked ? "Bearbeiten" : "Sperren";
  els.recipeLockButton.setAttribute("aria-pressed", String(recipeLocked));
}

function renderRings() {
  els.ringList.innerHTML = "";

  state.rings.forEach((ring) => {
    const row = els.ringTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = ring.id;
    row.querySelector('[data-field="name"]').value = ring.name;
    row.querySelector('[data-field="mass"]').value = ring.mass || "";
    row.querySelector('[data-field="count"]').value = ring.count || "";
    els.ringList.append(row);
  });
}

function calculate() {
  const { flour, eggs, water } = state.ingredients;
  const baseTotal = flour + eggs + water;
  const targetTotal = state.rings.reduce((sum, ring) => sum + ring.mass * ring.count, 0);
  const factor = baseTotal > 0 ? targetTotal / baseTotal : 0;

  els.baseTotal.value = `${formatGram(baseTotal)} Masse`;
  els.totalMass.value = formatGram(targetTotal);
  els.flourTotal.textContent = formatGram(flour * factor);
  els.eggsTotal.textContent = formatGram(eggs * factor);
  els.waterTotal.textContent = formatGram(water * factor);
  els.ratioWarning.hidden = baseTotal > 0 || targetTotal === 0;
}

function syncIngredient(field, value) {
  state.ingredients[field] = toNumber(value);
  saveState();
  calculate();
}

function updateRing(id, field, value) {
  const ring = state.rings.find((item) => item.id === id);
  if (!ring) return;
  ring[field] = field === "name" ? value : toNumber(value);
  saveState();
  calculate();
}

function addRing() {
  state.rings.push({
    id: uid(),
    name: "Neue Größe",
    mass: 0,
    count: 0
  });
  saveState();
  renderRings();
  calculate();
}

function removeRing(id) {
  state.rings = state.rings.filter((ring) => ring.id !== id);
  saveState();
  renderRings();
  calculate();
}

function resetAll() {
  state = cloneDefaultState();
  saveState();
  renderIngredients();
  renderRings();
  calculate();
}

els.flourInput.addEventListener("input", (event) => syncIngredient("flour", event.target.value));
els.eggsInput.addEventListener("input", (event) => syncIngredient("eggs", event.target.value));
els.waterInput.addEventListener("input", (event) => syncIngredient("water", event.target.value));

els.ringList.addEventListener("input", (event) => {
  const row = event.target.closest(".ring-row");
  if (!row) return;
  updateRing(row.dataset.id, event.target.dataset.field, event.target.value);
});

els.ringList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='remove']");
  if (!button) return;
  removeRing(button.closest(".ring-row").dataset.id);
});

els.addRingButton.addEventListener("click", addRing);
els.resetButton.addEventListener("click", resetAll);
els.recipeLockButton.addEventListener("click", () => {
  recipeLocked = !recipeLocked;
  renderRecipeLock();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

renderIngredients();
renderRings();
calculate();
