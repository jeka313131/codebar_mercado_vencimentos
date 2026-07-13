import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { initAuthGuard } from "./auth/guard.js";
import { initRouter, registerRoute } from "./router.js";
import { initScanner } from "./scanner.js";
import { initSidebar } from "./components/sidebar.js";
import { renderHome } from "./pages/home.js";
import { renderStock } from "./pages/stock.js";
import { renderAdd } from "./pages/add.js";
import { renderLogin } from "./pages/login.js";
import { renderVerifyPhone } from "./pages/verifyPhone.js";
import { renderAlertGroup } from "./pages/alertGroup.js";
import { renderProfile } from "./pages/profile.js";

registerSW({ immediate: true });

registerRoute("/login", renderLogin);
registerRoute("/verificar-telefone", renderVerifyPhone);
registerRoute("/", renderHome);
registerRoute("/estoque", renderStock);
registerRoute("/adicionar", renderAdd);
registerRoute("/grupo-alerta", renderAlertGroup);
registerRoute("/perfil", renderProfile);

initScanner();
initSidebar();
initRouter();
initAuthGuard();
