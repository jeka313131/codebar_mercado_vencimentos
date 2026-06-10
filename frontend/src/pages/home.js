import { fetchProductsExpiring } from "../api.js";
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
    <article class="product-row">
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
    <nav class="bottom-nav" aria-label="Navegação principal">
      <button type="button" class="nav-fab nav-fab--stock" id="btn-go-stock" aria-label="Estoque">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
        </svg>
      </button>
      <button type="button" class="nav-fab nav-fab--add" id="btn-go-add" aria-label="Adicionar produto">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.1-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 5H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
          <path fill="currentColor" d="M19 3h2v2h-2V3zm0 4h2v2h-2V7z"/>
        </svg>
      </button>
    </nav>
  `;

  const listEl = container.querySelector("#product-list");

  async function loadList() {
    listEl.innerHTML = `<p class="loading-msg">Carregando…</p>`;
    try {
      const products = await fetchProductsExpiring(activeFilter);
      if (!products.length) {
        listEl.innerHTML = `<p class="empty-msg">Nenhum produto neste período.</p>`;
        return;
      }
      listEl.innerHTML = products.map(renderProductRow).join("");
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

  container.querySelector("#btn-go-stock").addEventListener("click", () => {
    navigate("/estoque");
  });

  container.querySelector("#btn-go-add").addEventListener("click", () => {
    navigate("/adicionar");
  });

  await loadList();
}
