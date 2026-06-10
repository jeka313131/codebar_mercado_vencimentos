import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { initRouter, registerRoute } from "./router.js";
import { initScanner } from "./scanner.js";
import { renderHome } from "./pages/home.js";
import { renderStock } from "./pages/stock.js";
import { renderAdd } from "./pages/add.js";

registerSW({ immediate: true });

registerRoute("/", renderHome);
registerRoute("/estoque", renderStock);
registerRoute("/adicionar", renderAdd);

initScanner();
initRouter();
