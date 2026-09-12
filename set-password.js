(() => {
  const cfg = window.GLEMI_SUPABASE;
  const sb = window.supabase.createClient(cfg.url, cfg.key, {
    auth: { detectSessionInUrl: true, persistSession: true }
  });

  const form = document.getElementById('passwordForm');
  const status = document.getElementById('passwordStatus');
  const loginLink = document.getElementById('loginLink');
  const saveBtn = document.getElementById('savePasswordBtn');

  const setStatus = (message, kind = '') => {
    status.textContent = message;
    status.className = 'status' + (kind ? ' ' + kind : '');
  };

  async function establishSession() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    // PKCE / code flow. Supabase may send ?code=... after an invite.
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error && !/code verifier/i.test(error.message || '')) throw error;
      // Clean the one-time code from the address bar once consumed.
      history.replaceState({}, document.title, window.location.pathname);
    }

    // Implicit invite links carry access_token in the URL fragment.
    // supabase-js consumes it automatically; getSession confirms success.
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function init() {
    try {
      let session = await establishSession();

      // Give supabase-js a brief moment to process a hash-based auth callback.
      if (!session && window.location.hash.includes('access_token')) {
        await new Promise(resolve => setTimeout(resolve, 350));
        const r = await sb.auth.getSession();
        if (r.error) throw r.error;
        session = r.data.session;
      }

      if (!session) {
        setStatus('This invitation link is invalid or has expired. Send a new invitation from Supabase.', 'error');
        loginLink.hidden = false;
        return;
      }

      const email = (session.user?.email || '').toLowerCase();
      const allowed = ['glemiservices@gmail.com', 'baltazaranaya@outlook.com'];
      if (!allowed.includes(email)) {
        await sb.auth.signOut();
        setStatus('This email is not authorized for the GLEMI admin panel.', 'error');
        return;
      }

      form.hidden = false;
      setStatus('Invitation verified for ' + email + '.');
    } catch (err) {
      console.error(err);
      setStatus(err?.message || 'The invitation could not be validated. Request a new invitation.', 'error');
      loginLink.hidden = false;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (password.length < 8) {
      setStatus('Use a password of at least 8 characters.', 'error');
      return;
    }
    if (password !== confirm) {
      setStatus('The passwords do not match.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    const { error } = await sb.auth.updateUser({ password });
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save password';

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    setStatus('Password created successfully. You can now sign in to the GLEMI admin panel.', 'ok');
    form.hidden = true;
    loginLink.hidden = false;
  });

  init();
})();
