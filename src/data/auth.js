// ─── Authentication Service ─────────────────────────────────────────────────

const _roles = {
    GUARDIA: 'guardia',
    TH: 'th',
    GERENCIA: 'gerencia'
};

const _users = {
    guardia_a: {
        id: 101,
        username: 'guardia_a',
        password: '123',
        name: 'Guardia - Lote A',
        role: _roles.GUARDIA,
        assignedLot: 'Lote A - Adoquín',
        allowedPages: ['guard']
    },
    guardia_b: {
        id: 102,
        username: 'guardia_b',
        password: '123',
        name: 'Guardia - Lote B',
        role: _roles.GUARDIA,
        assignedLot: 'Lote B - Subsuelo',
        allowedPages: ['guard']
    },
    guardia_c: {
        id: 103,
        username: 'guardia_c',
        password: '123',
        name: 'Guardia - Lote C',
        role: _roles.GUARDIA,
        assignedLot: 'Lote C - Consulta Externa',
        allowedPages: ['guard']
    },
    th: {
        id: 2,
        username: 'th',
        password: '123',
        name: 'Talento Humano',
        role: _roles.TH,
        allowedPages: ['dashboard', 'guard', 'drivers', 'history', 'analytics']
    },
    gerencia: {
        id: 3,
        username: 'gerencia',
        password: '123',
        name: 'Gerencia General',
        role: _roles.GERENCIA,
        allowedPages: ['dashboard', 'guard', 'drivers', 'history', 'analytics']
    }
};

export const AUTH_KEY = 'parqueadero_session';

export function login(username, password) {
    const user = _users[username];
    if (user && user.password === password) {
        // Omitting password from session
        const { password: _, ...sessionUser } = user;
        localStorage.setItem(AUTH_KEY, JSON.stringify(sessionUser));
        return { success: true, user: sessionUser };
    }
    return { success: false, message: 'Usuario o contraseña incorrectos' };
}

export function logout() {
    localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUser() {
    const session = localStorage.getItem(AUTH_KEY);
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch (e) {
        return null;
    }
}

export function hasAccess(pageId) {
    const user = getCurrentUser();
    if (!user) return false;
    return user.allowedPages.includes(pageId);
}
