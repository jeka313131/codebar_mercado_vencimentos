import { navigate } from "../router.js";

let sidebarEl = null;

function ensureSidebar() {
  if (sidebarEl) return sidebarEl;

  sidebarEl = document.createElement("div");
  sidebarEl.className = "sidebar-root";
  sidebarEl.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop" aria-hidden="true"></div>
    <aside class="sidebar-panel" id="sidebar-panel" aria-label="Menu lateral">
      <p class="sidebar-logo">VENCEU</p>
      <nav class="sidebar-nav">
        <button type="button" class="sidebar-link" id="sidebar-alert-group">
          Grupo de alerta
        </button>
        <button type="button" class="sidebar-link" id="sidebar-profile">
          Perfil
        </button>
      </nav>
    </aside>
  `;

  document.body.appendChild(sidebarEl);

  sidebarEl.querySelector("#sidebar-backdrop").addEventListener("click", closeSidebar);
  sidebarEl.querySelector("#sidebar-alert-group").addEventListener("click", () => {
    closeSidebar();
    navigate("/grupo-alerta");
  });
  sidebarEl.querySelector("#sidebar-profile").addEventListener("click", () => {
    closeSidebar();
    navigate("/perfil");
  });

  return sidebarEl;
}

export function openSidebar() {
  const el = ensureSidebar();
  el.classList.add("is-open");
  document.body.classList.add("sidebar-open");
}

export function closeSidebar() {
  if (!sidebarEl) return;
  sidebarEl.classList.remove("is-open");
  document.body.classList.remove("sidebar-open");
}

export function initSidebar() {
  ensureSidebar();
}
