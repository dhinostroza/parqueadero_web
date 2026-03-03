// ─── Reusable Modal Component ───────────────────────────────────────────────

export function openModal(title, contentHTML, actions = []) {
    closeModal(); // Ensure no other modal is open

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'app-modal-overlay';
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
    });

    const actionsHTML = actions.map(a =>
        `<button class="btn ${a.class || 'btn-ghost'}" data-action="${a.id}">${a.label}</button>`
    ).join('');

    overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">${contentHTML}</div>
      ${actionsHTML ? `<div class="modal-actions">${actionsHTML}</div>` : ''}
    </div>
  `;

    document.body.appendChild(overlay);

    overlay.querySelector('#modal-close-btn').addEventListener('click', closeModal);

    // Hook up action buttons
    for (const a of actions) {
        const btn = overlay.querySelector(`[data-action="${a.id}"]`);
        if (btn && a.onClick) btn.addEventListener('click', a.onClick);
    }

    return overlay;
}

export function closeModal() {
    const overlay = document.getElementById('app-modal-overlay');
    if (overlay) overlay.remove();
}
