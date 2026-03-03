// ─── Login Page ─────────────────────────────────────────────────────────────
import { login } from '../data/auth.js';
import { showToast } from '../components/toast.js';

export const renderLogin = async (container, onLoginSuccess) => {
  container.innerHTML = `
    <div class="login-container">
      <div class="login-card glass-panel">
        <div class="login-header">
          <h1>🅿️ Parqueadero</h1>
          <p>Sistema de Control de Acceso</p>
        </div>
        
        <form id="login-form" class="login-form">
          <div class="form-group">
            <label for="username">Usuario</label>
            <input type="text" id="username" name="username" class="form-control" placeholder="Ej: guardia, th, gerencia" required autofocus>
          </div>
          
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input type="password" id="password" name="password" class="form-control" placeholder="••••••••" required>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block">Iniciar Sesión</button>
        </form>
        
        <div class="login-footer">
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 1.5rem; text-align: center;">
            Demo credenciales: <br>
            <strong>guardia_a</strong>, <strong>guardia_b</strong>, <strong>guardia_c</strong> / 123 (solo acceso)<br>
            <strong>th</strong> / 123 (acceso total)<br>
            <strong>gerencia</strong> / 123 (acceso total)
          </p>
        </div>
      </div>
    </div>
  `;

  // Attach event listener
  const form = document.getElementById('login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = form.username.value.trim();
    const password = form.password.value;

    if (!username || !password) return;

    const result = login(username, password);

    if (result.success) {
      showToast(`Bienvenido/a, ${result.user.name}`, 'success');
      if (onLoginSuccess) onLoginSuccess();
    } else {
      showToast(result.message, 'error');
      // Adding a little shake animation class
      const card = document.querySelector('.login-card');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
    }
  });
};
