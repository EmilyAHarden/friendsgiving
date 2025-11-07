// script.js — GitHub Issues backend (no leaves)

(function () {
  const REMOTE_JSON_URL = 'https://EmilyAHarden.github.io/friendsgiving/data/dishes.json';
  const ISSUE_NEW_URL_BASE = 'https://github.com/EmilyAHarden/friendsgiving/issues/new';

  const dishForm = document.getElementById('dish-form');
  const submitIssueBtn = document.getElementById('submitIssue');
  const clearFormBtn = document.getElementById('clearForm');

  const dishListEl = document.getElementById('dishList');
  const emptyStateEl = document.getElementById('emptyState');

  const filterVeganEl = document.getElementById('filterVegan');
  const filterGFEl = document.getElementById('filterGF');
  const filterLFEl = document.getElementById('filterLF');
  const searchTextEl = document.getElementById('searchText');
  const clearFiltersBtn = document.getElementById('clearFilters');

  let dishes = [];

  init();

  async function init() {
    await fetchRemote();
    renderDishes();
    wireEvents();
  }

  function wireEvents() {
    if (submitIssueBtn) {
      submitIssueBtn.addEventListener('click', () => {
        const dishName = dishForm.querySelector('#dishName')?.value.trim() || '';
        const yourName = dishForm.querySelector('#yourName')?.value.trim() || '';
        const isVegan = dishForm.querySelector('#isVegan')?.checked || false;
        const isGlutenFree = dishForm.querySelector('#isGlutenFree')?.checked || false;
        const isLactoseFree = dishForm.querySelector('#isLactoseFree')?.checked || false;

        const errors = [];
        if (!dishName) errors.push('Dish name is required.');
        if (!yourName) errors.push('Guest name is required.');
        if (errors.length) { alert(errors.join('\n')); return; }

        // Prefill issue title and body. We’ll target the dish issue template via labels.
        const title = encodeURIComponent(`Dish: ${dishName} — ${yourName}`);
        const body = encodeURIComponent([
          `Dish Name: ${dishName}`,
          `Guest Name: ${yourName}`,
          `Vegan: ${isVegan ? 'Yes' : 'No'}`,
          `Gluten Free: ${isGlutenFree ? 'Yes' : 'No'}`,
          `Lactose Free: ${isLactoseFree ? 'Yes' : 'No'}`,
        ].join('\n'));

        // Optional: pre-apply a label the workflow recognizes, e.g. "dish"
        const url = `${ISSUE_NEW_URL_BASE}?title=${title}&body=${body}&labels=${encodeURIComponent('dish')}`;

        window.open(url, '_blank', 'noopener,noreferrer');

        // Clear after opening
        dishForm.reset();
        dishForm.querySelector('#dishName')?.focus();
      });
    }

    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', () => {
        dishForm.reset();
        dishForm.querySelector('#dishName')?.focus();
      });
    }

    [filterVeganEl, filterGFEl, filterLFEl].forEach((el) => el && el.addEventListener('change', renderDishes));
    if (searchTextEl) searchTextEl.addEventListener('input', debounce(renderDishes, 120));
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        if (filterVeganEl) filterVeganEl.checked = false;
        if (filterGFEl) filterGFEl.checked = false;
        if (filterLFEl) filterLFEl.checked = false;
        if (searchTextEl) searchTextEl.value = '';
        renderDishes();
      });
    }
  }

  async function fetchRemote() {
    try {
      const res = await fetch(REMOTE_JSON_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      dishes = Array.isArray(data) ? data : [];
    } catch (e) {
      dishes = [];
    }
  }

  async function refreshFromRepo() {
    await fetchRemote();
    renderDishes();
  }

  function renderDishes() {
    if (!dishListEl || !emptyStateEl) return;

    const onlyVegan = !!filterVeganEl?.checked;
    const onlyGF = !!filterGFEl?.checked;
    const onlyLF = !!filterLFEl?.checked;
    const q = (searchTextEl?.value || '').trim().toLowerCase();

    const filtered = dishes.filter((d) => {
      if (onlyVegan && !d.isVegan) return false;
      if (onlyGF && !d.isGlutenFree) return false;
      if (onlyLF && !d.isLactoseFree) return false;

      if (q) {
        const hay = [d.dishName, d.yourName, d.isVegan ? 'vegan' : '', d.isGlutenFree ? 'gluten free' : '', d.isLactoseFree ? 'lactose free' : '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    dishListEl.innerHTML = '';
    dishListEl.setAttribute('aria-busy', 'true');

    if (filtered.length === 0) {
      emptyStateEl.style.display = 'block';
    } else {
      emptyStateEl.style.display = 'none';
      filtered
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach((d) => {
          const li = document.createElement('li');
          li.className = 'dish-card';
          li.innerHTML = `
            <div>
              <h3 class="dish-title">${escapeHTML(d.dishName)}</h3>
              <div class="dish-meta">by ${escapeHTML(d.yourName)}</div>
              <div class="tag-row">
                ${d.isVegan ? '<span class="tag vegan">Vegan</span>' : ''}
                ${d.isGlutenFree ? '<span class="tag gf">Gluten Free</span>' : ''}
                ${d.isLactoseFree ? '<span class="tag lf">Lactose Free</span>' : ''}
              </div>
            </div>
          `;
          dishListEl.appendChild(li);
        });
    }

    dishListEl.setAttribute('aria-busy', 'false');
  }

  function escapeHTML(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Optional: periodically refresh the list from the repo
  setInterval(() => { refreshFromRepo(); }, 60_000);
})();
