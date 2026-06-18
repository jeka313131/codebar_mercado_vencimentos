const routes = new Map();

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function getPath() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const path = hash.split("?")[0];
  return path.startsWith("/") ? path : `/${path}`;
}

export function getRouteQuery() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const query = hash.split("?")[1] || "";
  return new URLSearchParams(query);
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
    // renderRoute é acionado pelo auth guard após checar sessão
  });
}
