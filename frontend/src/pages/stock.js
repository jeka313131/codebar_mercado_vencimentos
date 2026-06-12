import { fetchAllProducts } from "../api.js";
import { openProductModal } from "../components/productModal.js";
import { formatDateBrYy } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { navigate } from "../router.js";

const SORT_COLUMNS = [
  { key: "name", label: "Descrição", className: "col-desc" },
  { key: "quantity", label: "Qtd", className: "col-qty" },
  { key: "expiryDate", label: "Vencimento", className: "col-date" },
  { key: "barcode", label: "Código", className: "col-code" },
];

function compareProducts(a, b, key, direction) {
  const factor = direction === "asc" ? 1 : -1;

  if (key === "quantity") {
    return (Number(a.quantity) - Number(b.quantity)) * factor;
  }

  const left = String(a[key] ?? "").toLowerCase();
  const right = String(b[key] ?? "").toLowerCase();
  return left.localeCompare(right, "pt-BR") * factor;
}

function renderSortButton(column, sortKey, sortDir) {
  const isActive = sortKey === column.key;
  const ascActive = isActive && sortDir === "asc" ? " is-active" : "";
  const descActive = isActive && sortDir === "desc" ? " is-active" : "";

  return `
    <button type="button" class="sort-btn" data-sort="${column.key}" aria-label="Ordenar por ${column.label}">
      <span class="sort-label">${column.label}</span>
      <span class="sort-arrows" aria-hidden="true">
        <span class="sort-arrow sort-arrow--up${ascActive}">▲</span>
        <span class="sort-arrow sort-arrow--down${descActive}">▼</span>
      </span>
    </button>
  `;
}

function renderTableHead(sortKey, sortDir) {
  return `
    <thead>
      <tr>
        ${SORT_COLUMNS.map(
          (column) => `
            <th class="sortable-th ${column.className}" scope="col">
              ${renderSortButton(column, sortKey, sortDir)}
            </th>
          `,
        ).join("")}
      </tr>
    </thead>
  `;
}

function renderTableBody(products) {
  return `
    <tbody>
      ${products
        .map(
          (product) => `
        <tr class="table-row--clickable" data-id="${product.id}" role="button" tabindex="0">
          <td class="col-desc">
            <div class="table-product">
              <img src="${escapeHtml(product.imageUrl)}" alt="" class="table-thumb" />
              <span class="table-product-name">${escapeHtml(product.name)}</span>
            </div>
          </td>
          <td class="col-qty">${product.quantity}</td>
          <td class="col-date">${escapeHtml(formatDateBrYy(product.expiryDate))}</td>
          <td class="col-code">${escapeHtml(product.barcode)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  `;
}

export async function renderStock(container) {
  container.className = "page page-stock";
  container.innerHTML = `
    <header class="page-top">
      <button type="button" class="btn-back" id="btn-back">← Voltar</button>
      <h1 class="page-title">Estoque</h1>
    </header>
    <div class="table-wrap table-wrap--scroll" id="stock-table">
      <p class="loading-msg">Carregando…</p>
    </div>
  `;

  container.querySelector("#btn-back").addEventListener("click", () => {
    navigate("/");
  });

  const tableEl = container.querySelector("#stock-table");
  let currentProducts = [];
  let sortKey = "expiryDate";
  let sortDir = "asc";

  function openProductEditor(productId) {
    const product = currentProducts.find((item) => item.id === productId);
    if (!product) return;
    openProductModal(product, { onUpdated: loadTable, onDeleted: loadTable });
  }

  function renderTable() {
    const sorted = [...currentProducts].sort((a, b) => compareProducts(a, b, sortKey, sortDir));

    tableEl.innerHTML = `
      <table class="data-table data-table--stock">
        ${renderTableHead(sortKey, sortDir)}
        ${renderTableBody(sorted)}
      </table>
    `;
  }

  async function loadTable() {
    tableEl.innerHTML = `<p class="loading-msg">Carregando…</p>`;

    try {
      currentProducts = await fetchAllProducts();

      if (!currentProducts.length) {
        tableEl.innerHTML = `<p class="empty-msg">Nenhum produto cadastrado.</p>`;
        return;
      }

      renderTable();
    } catch (error) {
      tableEl.innerHTML = `<p class="error-msg">${escapeHtml(error.message)}</p>`;
    }
  }

  tableEl.addEventListener("click", (event) => {
    const sortBtn = event.target.closest("[data-sort]");
    if (sortBtn) {
      event.stopPropagation();
      const key = sortBtn.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      renderTable();
      return;
    }

    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openProductEditor(row.dataset.id);
  });

  tableEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    event.preventDefault();
    openProductEditor(row.dataset.id);
  });

  await loadTable();
}
