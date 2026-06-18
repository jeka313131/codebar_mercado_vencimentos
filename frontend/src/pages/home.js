import { fetchProductsExpiring } from "../api.js";
import { openProductModal } from "../components/productModal.js";
import { renderBottomNav, initBottomNav } from "../components/bottomNav.js";
import { formatExpiryLabel } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { navigate } from "../router.js";

const FILTERS = [
  { days: 7, label: "7 DIAS" },
  { days: 3, label: "3 DIAS" },
  { days: 1, label: "1 DIA" },
  { days: 0, label: "HOJE" },
];

let activeFilter = 7;

function renderProductRow(product) {
  return `
    <article class="product-row product-row--clickable" data-id="${product.id}" role="button" tabindex="0">
      <img
        class="product-thumb"
        src="${escapeHtml(product.imageUrl)}"
        alt=""
        loading="lazy"
      />
      <div class="product-info">
        <p class="product-name">${escapeHtml(product.name)}</p>
        <p class="product-expiry">${escapeHtml(formatExpiryLabel(product.expiryDate))}</p>
        <p class="product-qty">Qtd Vencd: ${product.quantity}</p>
      </div>
    </article>
  `;
}

function renderFilters() {
  return FILTERS.map(
    (f) => `
      <button
        type="button"
        class="filter-pill${f.days === activeFilter ? " is-active" : ""}"
        data-days="${f.days}"
      >
        ${f.label}
      </button>
    `,
  ).join("");
}

export async function renderHome(container) {
  container.className = "page page-home";
  container.innerHTML = `
    <header class="home-header">
      <h1 class="home-title">Vence em:</h1>
      <div class="filter-row" id="filter-row">
        ${renderFilters()}
      </div>
    </header>
    <div class="product-list" id="product-list">
      <p class="loading-msg">Carregando…</p>
    </div>
    ${renderBottomNav()}
  `;

  const listEl = container.querySelector("#product-list");
  let currentProducts = [];

  function openProductEditor(productId) {
    const product = currentProducts.find((item) => item.id === productId);
    if (!product) return;
    openProductModal(product, { onUpdated: loadList, onDeleted: loadList });
  }

  async function loadList() {
    listEl.innerHTML = `<p class="loading-msg">Carregando…</p>`;
    try {
      currentProducts = await fetchProductsExpiring(activeFilter);
      if (!currentProducts.length) {
        listEl.innerHTML = `<p class="empty-msg">Nenhum produto neste período.</p>`;
        return;
      }
      listEl.innerHTML = currentProducts.map(renderProductRow).join("");
    } catch (error) {
      listEl.innerHTML = `<p class="error-msg">${escapeHtml(error.message)}</p>`;
    }
  }

  container.querySelector("#filter-row").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-days]");
    if (!btn) return;
    activeFilter = Number(btn.dataset.days);
    container.querySelector("#filter-row").innerHTML = renderFilters();
    loadList();
  });

  initBottomNav(container, { navigate });

  listEl.addEventListener("click", (event) => {
    const row = event.target.closest("[data-id]");
    if (!row) return;
    openProductEditor(row.dataset.id);
  });

  listEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("[data-id]");
    if (!row) return;
    event.preventDefault();
    openProductEditor(row.dataset.id);
  });

  await loadList();
}
