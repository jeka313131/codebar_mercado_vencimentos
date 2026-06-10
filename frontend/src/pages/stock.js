import { fetchAllProducts } from "../api.js";
import { formatDateBr } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { navigate } from "../router.js";

export async function renderStock(container) {
  container.className = "page page-stock";
  container.innerHTML = `
    <header class="page-top">
      <button type="button" class="btn-back" id="btn-back">← Voltar</button>
      <h1 class="page-title">Estoque</h1>
    </header>
    <div class="table-wrap" id="stock-table">
      <p class="loading-msg">Carregando…</p>
    </div>
  `;

  container.querySelector("#btn-back").addEventListener("click", () => {
    navigate("/");
  });

  const tableEl = container.querySelector("#stock-table");

  try {
    const products = await fetchAllProducts();

    if (!products.length) {
      tableEl.innerHTML = `<p class="empty-msg">Nenhum produto cadastrado.</p>`;
      return;
    }

    tableEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Qtd</th>
            <th>Vencimento</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map(
              (p) => `
            <tr>
              <td>
                <div class="table-product">
                  <img src="${escapeHtml(p.imageUrl)}" alt="" class="table-thumb" />
                  <span>${escapeHtml(p.name)}</span>
                </div>
              </td>
              <td>${p.quantity}</td>
              <td>${escapeHtml(formatDateBr(p.expiryDate))}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (error) {
    tableEl.innerHTML = `<p class="error-msg">${escapeHtml(error.message)}</p>`;
  }
}
