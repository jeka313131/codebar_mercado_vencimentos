const routes = new Map();

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

function getPath() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  return hash.startsWith("/") ? hash : `/${hash}`;
}

export async function navigate(path) {
  window.location.hash = path;
}

export async function renderRoute() {
  const path = getPath();
  const handler = routes.get(path) ?? routes.get("/");
  const app = document.getElementById("app");

  if (!handler || !app) return;

  app.innerHTML = "";
  await handler(app);
}

export function initRouter() {
  window.addEventListener("hashchange", () => {
    renderRoute();
  });
  renderRoute();
}
