// ─── Main Application Controller ────────────────────────────────────────────
import './styles/main.css';
import { seedDemoData } from './data/store.js';
import { isSupabaseReady } from './data/supabaseClient.js';
import { getCurrentUser, logout, hasAccess } from './data/auth.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderDrivers } from './pages/drivers.js';
import { renderGuard } from './pages/guard.js';
import { renderHistory } from './pages/history.js';
import { renderAnalytics } from './pages/analytics.js';

const PAGES = {
  dashboard: { render: renderDashboard, icon: '📊', label: 'Dashboard' },
  guard: { render: renderGuard, icon: '🛡️', label: 'Control de Acceso' },
  drivers: { render: renderDrivers, icon: '👥', label: 'Conductores' },
  history: { render: renderHistory, icon: '📜', label: 'Bitácora' },
  analytics: { render: renderAnalytics, icon: '📈', label: 'Reportes y Análisis' },
};

let currentPage = 'dashboard';

function navigateTo(page) {
  if (!PAGES[page]) return;
  if (!hasAccess(page)) {
    console.error(`User does not have access to page: ${page}`);
    return;
  }
  currentPage = page;
  renderApp();
  // Close mobile sidebar
  document.querySelector('.sidebar')?.classList.remove('open');
}

async function renderApp() {
  const app = document.getElementById('app');
  const user = getCurrentUser();

  if (!user) {
    // Render Login Screen if not logged in
    await renderLogin(app, () => {
      // Upon successful login, decide the landing page based on role
      const currentUser = getCurrentUser();
      currentPage = currentUser.allowedPages[0];
      renderApp();
    });
    return;
  }

  // Ensure current page is allowed for the logged in user
  if (!hasAccess(currentPage)) {
    currentPage = user.allowedPages[0];
  }

  const page = PAGES[currentPage];

  const dbMode = isSupabaseReady() ? '🟢 Supabase' : '🟡 Local';

  app.innerHTML = `
    <!-- Mobile Toggle -->
    <button class="mobile-toggle" id="mobile-toggle">☰</button>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <h1>🅿️ Hospital Pablo Arturo Suárez</h1>
        <p>Sistema de control</p>
      </div>
      <div class="sidebar-user" style="padding: 1rem 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text-muted); font-size: 0.85rem;">
        👤 ${user.name} <br>
        <span style="opacity:0.7">${user.role.toUpperCase()}</span>
      </div>
      <ul class="sidebar-nav">
        ${user.allowedPages.map(pageId => {
    const p = PAGES[pageId];
    if (!p) return '';
    return `
            <li>
              <a data-page="${pageId}" class="${pageId === currentPage ? 'active' : ''}">
                <span class="nav-icon">${p.icon}</span>
                ${p.label}
              </a>
            </li>
          `;
  }).join('')}
      </ul>
      <div style="flex-grow: 1;"></div>
      <div class="sidebar-nav" style="padding-bottom: 1rem;">
        <li>
            <a id="btn-logout" style="color: #f87171; cursor: pointer;">
              <span class="nav-icon">🚪</span>
              Cerrar sesión
            </a>
        </li>
      </div>
      <div class="sidebar-status">
        <span class="status-dot"></span>
        <span>Activo — ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="sidebar-db-mode" style="padding: 0 1.5rem 1rem;">
        <span style="font-size:0.72rem;color:var(--text-muted);">${dbMode}</span>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content" id="main-content"></main>
  `;

  // Hook up navigation
  app.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Hook up logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    logout();
    renderApp();
  });

  // Mobile toggle
  document.getElementById('mobile-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Render current page (async)
  const mainContent = document.getElementById('main-content');
  await page.render(mainContent);
}

// ─── Initialize ─────────────────────────────────────────────────────────────
async function init() {
  await seedDemoData();
  await renderApp();
}

init().catch(err => {
  console.error('App init error:', err);
  document.getElementById('app').innerHTML = `
    <div style="padding:2rem;text-align:center;color:#f87171;">
      <h2>Error inicializando la aplicación</h2>
      <p>${err.message}</p>
    </div>`;
});

// Expose for debugging
window.navigateTo = navigateTo;
