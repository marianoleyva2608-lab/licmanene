// Login obligatorio para las paginas de administracion (dashboard, panel-citas).
// Uso:  const _supabase = await requerirLoginAdmin();
// Muestra un formulario de acceso hasta que haya una sesion valida de Supabase.

function escaparHTML(v) {
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function tokenAdmin(client) {
    const { data } = await client.auth.getSession();
    return data && data.session ? data.session.access_token : '';
}

async function cerrarSesionAdmin(client) {
    try { await client.auth.signOut(); } catch (e) {}
    window.location.href = 'index.html';
}

function requerirLoginAdmin() {
    const cfg = window.LIC_CONFIG;
    const client = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    return new Promise(async (resolve) => {
        const { data } = await client.auth.getSession();
        if (data && data.session) { resolve(client); return; }

        document.body.style.visibility = 'hidden';
        const overlay = document.createElement('div');
        overlay.style.cssText = 'visibility:visible;position:fixed;inset:0;z-index:99999;background:#0c0b0a;display:flex;align-items:center;justify-content:center;font-family:Montserrat,Arial,sans-serif;';
        overlay.innerHTML =
            '<form id="login-admin" style="background:#1a1a1a;border:1px solid #d4af37;border-radius:12px;padding:30px;width:90%;max-width:340px;color:#f8f8f8;">' +
            '<h2 style="color:#d4af37;margin:0 0 20px 0;font-size:1.2rem;">Acceso del despacho</h2>' +
            '<input id="login-email" type="email" placeholder="Correo" required autocomplete="username" style="width:100%;box-sizing:border-box;padding:12px;margin-bottom:12px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;">' +
            '<input id="login-pass" type="password" placeholder="Contraseña" required autocomplete="current-password" style="width:100%;box-sizing:border-box;padding:12px;margin-bottom:12px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;">' +
            '<div id="login-error" style="color:#ef4444;font-size:0.85rem;margin-bottom:12px;display:none;"></div>' +
            '<button type="submit" style="width:100%;padding:12px;border:none;border-radius:6px;background:#d4af37;color:#000;font-weight:700;cursor:pointer;">Entrar</button>' +
            '<a href="index.html" style="display:block;text-align:center;margin-top:14px;color:#888;font-size:0.8rem;">Volver al inicio</a>' +
            '</form>';
        document.documentElement.appendChild(overlay);

        overlay.querySelector('#login-admin').addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = overlay.querySelector('#login-error');
            err.style.display = 'none';
            const { error } = await client.auth.signInWithPassword({
                email: overlay.querySelector('#login-email').value.trim(),
                password: overlay.querySelector('#login-pass').value
            });
            if (error) {
                err.textContent = 'Correo o contraseña incorrectos.';
                err.style.display = 'block';
                return;
            }
            overlay.remove();
            document.body.style.visibility = 'visible';
            resolve(client);
        });
    });
}
