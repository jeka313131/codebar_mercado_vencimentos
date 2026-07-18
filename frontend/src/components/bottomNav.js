import { getPath } from "../router.js";
import { openSidebar } from "./sidebar.js";

const ICONS = {
  menu: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>`,
  stock: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4V6h5.17l2 2H20v12z"/></svg>`,
  add: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.1-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 20 5H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
};

export function renderBottomNav() {
  const path = getPath();
  const active = (route) => (path === route || path.startsWith(`${route}?`) ? " is-active" : "");

  return `
    <nav class="app-bottom-nav" aria-label="Navegação principal">
      <button type="button" class="bottom-nav-item${active("/menu")}" id="nav-menu" aria-label="Menu">
        ${ICONS.menu}
        <span>Menu</span>
      </button>
      <button type="button" class="bottom-nav-item${active("/estoque")}" id="nav-stock" aria-label="Estoque">
        ${ICONS.stock}
        <span>Estoque</span>
      </button>
      <button type="button" class="bottom-nav-item${active("/adicionar")}" id="nav-add" aria-label="Adicionar">
        ${ICONS.add}
        <span>Adicionar</span>
      </button>
    </nav>
  `;
}

export function initBottomNav(container, { navigate }) {
  container.querySelector("#nav-menu")?.addEventListener("click", () => {
    openSidebar();
  });

  container.querySelector("#nav-stock")?.addEventListener("click", () => {
    navigate("/estoque");
  });

  container.querySelector("#nav-add")?.addEventListener("click", () => {
    try {
      sessionStorage.setItem("openScanOnce", "1");
    } catch {
      // ignore
    }
    navigate("/adicionar");
  });
}
