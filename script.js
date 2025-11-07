// Friendsgiving Potluck — Dish-only (JS panel, no leaves)
// Local-only persistence via localStorage

(function () {
  const STORAGE_DISHES = "friendsgiving_dishes_v6";

  // Elements (IDs must match HTML exactly)
  const dishForm = document.getElementById("dish-form");
  const dishListEl = document.getElementById("dishList");
  const emptyStateEl = document.getElementById("emptyState");
  const clearFormBtn = document.getElementById("clearForm");

  const filterVeganEl = document.getElementById("filterVegan");
  const filterGFEl = document.getElementById("filterGF");
  const filterLFEl = document.getElementById("filterLF");
  const searchTextEl = document.getElementById("searchText");
  const clearFiltersBtn = document.getElementById("clearFilters");

  const exportBtn = document.getElementById("exportJSON");
  const resetAllBtn = document.getElementById("resetAll");

  const jsonDialog = document.getElementById("jsonDialog");
  const jsonOutput = document.getElementById("jsonOutput");
  const copyJSONBtn = document.getElementById("copyJSON");
  const closeJSONBtn = document.getElementById("closeJSON");

  // State
  let dishes = load(STORAGE_DISHES, seedDishes());

  // Init
  renderDishes();

  // Dish form handlers
  if (dishForm) {
    dishForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const dishNameInput = dishForm.querySelector("#dishName");
      const yourNameInput = dishForm.querySelector("#yourName");
      const isVeganInput = dishForm.querySelector("#isVegan");
      const isGlutenFreeInput = dishForm.querySelector("#isGlutenFree");
      const isLactoseFreeInput = dishForm.querySelector("#isLactoseFree");

      const dishName = (dishNameInput?.value || "").trim();
      const yourName = (yourNameInput?.value || "").trim();
      const isVegan = !!isVeganInput?.checked;
      const isGlutenFree = !!isGlutenFreeInput?.checked;
      const isLactoseFree = !!isLactoseFreeInput?.checked;

      const errors = [];
      if (!dishName) errors.push("Dish name is required.");
      if (!yourName) errors.push("Guest name is required.");
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }

      const item = {
        id: cryptoId(),
        dishName,
        yourName,
        isVegan,
        isGlutenFree,
        isLactoseFree,
        createdAt: new Date().toISOString()
      };

      dishes.push(item);
      save(STORAGE_DISHES, dishes);
      renderDishes();
      dishForm.reset();
      dishNameInput?.focus();
    });
  }

  if (clearFormBtn && dishForm) {
    clearFormBtn.addEventListener("click", () => {
      dishForm.reset();
      dishForm.querySelector("#dishName")?.focus();
    });
  }

  // Filters
  [filterVeganEl, filterGFEl, filterLFEl].forEach(
    (el) => el && el.addEventListener("change", renderDishes)
  );
  if (searchTextEl)
    searchTextEl.addEventListener("input", debounce(renderDishes, 120));
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (filterVeganEl) filterVeganEl.checked = false;
      if (filterGFEl) filterGFEl.checked = false;
      if (filterLFEl) filterLFEl.checked = false;
      if (searchTextEl) searchTextEl.value = "";
      renderDishes();
    });
  }

  // Export JSON
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const json = JSON.stringify({ dishes }, null, 2);
      if (jsonOutput) jsonOutput.value = json;
      if (jsonDialog && typeof jsonDialog.showModal === "function") {
        jsonDialog.showModal();
      } else {
        alert("Exported JSON:\n\n" + json);
      }
    });
  }

  if (copyJSONBtn && jsonOutput) {
    copyJSONBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(jsonOutput.value);
        copyJSONBtn.textContent = "Copied!";
        setTimeout(() => (copyJSONBtn.textContent = "Copy"), 1200);
      } catch {
        alert("Copy failed. You can select and copy manually.");
      }
    });
  }

  if (closeJSONBtn && jsonDialog) {
    closeJSONBtn.addEventListener("click", () => {
      jsonDialog.close();
    });
  }

  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      const confirmReset = confirm(
        "This will clear the saved list in THIS browser only. Continue?"
      );
      if (!confirmReset) return;
      dishes = [];
      save(STORAGE_DISHES, dishes);
      renderDishes();
    });
  }

  // Render dishes
  function renderDishes() {
    if (!dishListEl || !emptyStateEl) return;

    const onlyVegan = !!filterVeganEl?.checked;
    const onlyGF = !!filterGFEl?.checked;
    const onlyLF = !!filterLFEl?.checked;
    const q = (searchTextEl?.value || "").trim().toLowerCase();

    const filtered = dishes.filter((d) => {
      if (onlyVegan && !d.isVegan) return false;
      if (onlyGF && !d.isGlutenFree) return false;
      if (onlyLF && !d.isLactoseFree) return false;

      if (q) {
        const hay = [
          d.dishName,
          d.yourName,
          d.isVegan ? "vegan" : "",
          d.isGlutenFree ? "gluten free" : "",
          d.isLactoseFree ? "lactose free" : ""
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    dishListEl.innerHTML = "";
    dishListEl.setAttribute("aria-busy", "true");

    if (filtered.length === 0) {
      emptyStateEl.style.display = "block";
    } else {
      emptyStateEl.style.display = "none";
      filtered
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach((d) => {
          const li = document.createElement("li");
          li.className = "dish-card";
          li.innerHTML = `
            <div>
              <h3 class="dish-title">${escapeHTML(d.dishName)}</h3>
              <div class="dish-meta">by ${escapeHTML(d.yourName)}</div>
              <div class="tag-row">
                ${d.isVegan ? '<span class="tag vegan">Vegan</span>' : ""}
                ${
                  d.isGlutenFree
                    ? '<span class="tag gf">Gluten Free</span>'
                    : ""
                }
                ${
                  d.isLactoseFree
                    ? '<span class="tag lf">Lactose Free</span>'
                    : ""
                }
              </div>
            </div>
            <div class="card-actions">
              <button class="btn" data-action="edit" aria-label="Edit ${escapeHTML(
                d.dishName
              )}">Edit</button>
              <button class="btn danger" data-action="remove" aria-label="Remove ${escapeHTML(
                d.dishName
              )}">Remove</button>
            </div>
          `;
          li.querySelector('[data-action="remove"]').addEventListener(
            "click",
            () => removeDish(d.id)
          );
          li.querySelector('[data-action="edit"]').addEventListener(
            "click",
            () => editDish(d.id)
          );
          dishListEl.appendChild(li);
        });
    }

    dishListEl.setAttribute("aria-busy", "false");
  }

  // Edit dish via prompts
  function editDish(id) {
    const d = dishes.find((x) => x.id === id);
    if (!d) return;

    const newDishName = prompt("Update dish name:", d.dishName);
    if (newDishName === null) return;
    const newYourName = prompt("Update guest name:", d.yourName);
    if (newYourName === null) return;
    const makeVegan = confirm("Mark as Vegan? (OK = Yes, Cancel = No)");
    const makeGF = confirm("Mark as Gluten Free? (OK = Yes, Cancel = No)");
    const makeLF = confirm("Mark as Lactose Free? (OK = Yes, Cancel = No)");

    const errs = [];
    if (!newDishName.trim()) errs.push("Dish name cannot be empty.");
    if (!newYourName.trim()) errs.push("Guest name cannot be empty.");
    if (errs.length) {
      alert(errs.join("\n"));
      return;
    }

    d.dishName = newDishName.trim();
    d.yourName = newYourName.trim();
    d.isVegan = makeVegan;
    d.isGlutenFree = makeGF;
    d.isLactoseFree = makeLF;

    save(STORAGE_DISHES, dishes);
    renderDishes();
  }

  function removeDish(id) {
    const dish = dishes.find((x) => x.id === id);
    const ok = confirm(`Remove "${dish?.dishName ?? "this item"}"?`);
    if (!ok) return;
    dishes = dishes.filter((x) => x.id !== id);
    save(STORAGE_DISHES, dishes);
    renderDishes();
  }

  // Storage helpers
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  }

  // Seed initial examples
  function seedDishes() {
    return [
      {
        id: cryptoId(),
        dishName: "Pumpkin Pie",
        yourName: "Emily",
        isVegan: false,
        isGlutenFree: false,
        isLactoseFree: false,
        createdAt: new Date().toISOString()
      },
      {
        id: cryptoId(),
        dishName: "Roasted Veggies",
        yourName: "Geoff",
        isVegan: true,
        isGlutenFree: true,
        isLactoseFree: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Utils
  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cryptoId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return (
      "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
  }

  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
})();