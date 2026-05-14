// ============================================================================
// CasaMorf — Main Application
// GitHub API shared storage (same as evChargeTracker)
// PIN protected, multi-device sync via data/store.json in repo
// ============================================================================

const App = (() => {
    // ========================================================================
    // STATE
    // ========================================================================
    let state = {
        currentUser: null, // { name, avatar }
        household: null,
        members: [],
        items: [],
        tasks: [],
        tab: 'dashboard',
        modal: null,
        editMemberId: null,
        loading: false,
        error: null,
        syncing: false,
    };

    const CATEGORIES = [
        { id: 'kuehl', label: 'Kühlregal', icon: '🥛', color: '#47C9FF' },
        { id: 'gemuese', label: 'Gemüse & Obst', icon: '🥬', color: '#5AE4A8' },
        { id: 'fleisch', label: 'Fleisch & Fisch', icon: '🥩', color: '#FF6B8A' },
        { id: 'backwaren', label: 'Backwaren', icon: '🍞', color: '#FFB347' },
        { id: 'tiefkuehl', label: 'Tiefkühl', icon: '🧊', color: '#47C9FF' },
        { id: 'getraenke', label: 'Getränke', icon: '🥤', color: '#B47AFF' },
        { id: 'drogerie', label: 'Drogerie', icon: '🧴', color: '#FF7EB3' },
        { id: 'haushalt', label: 'Haushalt', icon: '🧹', color: '#FF9E47' },
        { id: 'sonstiges', label: 'Sonstiges', icon: '📦', color: '#8B93A7' },
    ];

    const FREQUENCIES = [
        { id: 'daily', label: 'Täglich', short: '1d' },
        { id: 'weekly', label: 'Wöchentlich', short: '1w' },
        { id: 'biweekly', label: 'Alle 2 Wo', short: '2w' },
        { id: 'monthly', label: 'Monatlich', short: '1m' },
        { id: 'once', label: 'Einmalig', short: '1x' },
    ];

    const AVATARS = [
        // People
        '🧑‍💻', '👩‍🍳', '🧑‍🎨', '👨‍🔧', '👩‍💼', '🧑‍🏫', '👨‍🌾', '🧑‍🚀',
        // Sports & Outdoor
        '🪂', '🚴', '🏔️', '⛷️', '🏄', '🧗', '🚵', '🏃',
        // Animals
        '🦊', '🐱', '🐻', '🦉', '🐶', '🦁', '🐺', '🦅',
        // Fun
        '👾', '🤖', '🎮', '🌟', '🔥', '💎', '🍀', '🎯',
    ];

    // ========================================================================
    // HELPERS
    // ========================================================================
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const $ = (sel) => document.querySelector(sel);
    const el = (tag, attrs = {}, ...children) => {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'class') e.className = v;
            else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
            else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
            else e.setAttribute(k, v);
        }
        children.flat().forEach(c => {
            if (c == null) return;
            e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
        return e;
    };

    function fmtDate(d) {
        const ms = Date.now() - new Date(d).getTime();
        const h = ms / 3.6e6;
        if (h < 1) return 'gerade eben';
        if (h < 24) return `vor ${Math.floor(h)}h`;
        if (h < 48) return 'gestern';
        return new Date(d).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
    }

    // Inline SVG icons
    const icons = {
        home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
        cart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
        tasks: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
        users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
        check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
        x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
        trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
        chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
        repeat: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
        flame: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
        alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
        sparkles: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
        download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
        refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
        settings: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    };

    function icon(name, size) {
        const span = el('span');
        span.innerHTML = icons[name] || '';
        if (size) {
            const svg = span.querySelector('svg');
            if (svg) { svg.setAttribute('width', size); svg.setAttribute('height', size); }
        }
        return span;
    }

    // ========================================================================
    // SAVE / LOAD (GitHub API)
    // ========================================================================
    async function saveAll() {
        state.syncing = true;
        updateSyncIndicator();
        const ok = await CasaStore.saveAll({
            household: state.household,
            members: state.members,
            items: state.items,
            tasks: state.tasks,
        });
        state.syncing = false;
        updateSyncIndicator();
        if (!ok) {
            toast('⚠️ Sync fehlgeschlagen!');
            console.error('saveAll failed — data not written to GitHub');
        }
    }

    function updateSyncIndicator() {
        const dot = $('#sync-dot');
        if (dot) dot.style.background = state.syncing ? '#FFB347' : '#5AE4A8';
    }

    // ========================================================================
    // TOAST
    // ========================================================================
    function toast(msg) {
        const existing = $('.toast');
        if (existing) existing.remove();
        const t = el('div', { class: 'toast' }, msg);
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2200);
    }

    // ========================================================================
    // RENDER ENGINE
    // ========================================================================
    function render() {
        const app = $('#app');
        app.innerHTML = '';

        // Step 1: First time setup OR returning but not yet unlocked
        if (!CasaStore.isConnected()) {
            // No credentials saved → full setup (repo + token + password)
            if (!CasaStore.hasCredentials()) {
                renderSetup(app, true);
                return;
            }
            // Has credentials but not connected yet → show password-only unlock
            renderSetup(app, false);
            return;
        }

        // Step 2: Connected but session not authenticated → password unlock
        if (!CasaStore.isSessionAuth()) {
            renderSetup(app, false);
            return;
        }

        // Step 3: Pick user (if not selected this session)
        if (!state.currentUser) {
            renderUserPicker(app);
            return;
        }

        // Main app
        app.appendChild(renderHeader());
        const main = el('div', { class: 'main' });
        if (state.tab === 'dashboard') renderDashboard(main);
        else if (state.tab === 'shopping') renderShopping(main);
        else if (state.tab === 'tasks') renderTasks(main);
        else if (state.tab === 'household') renderHousehold(main);
        app.appendChild(main);
        app.appendChild(renderNav());

        if (state.modal === 'addItem') app.appendChild(renderAddItemModal());
        if (state.modal === 'addTask') app.appendChild(renderAddTaskModal());
        if (state.modal === 'editMember') app.appendChild(renderEditMemberModal());
    }

    // ========================================================================
    // SETUP / UNLOCK SCREEN (combined, like evChargeTracker)
    // isFirstTime: show all 3 fields. Otherwise: password only.
    // ========================================================================
    function renderSetup(container, isFirstTime) {
        const page = el('div', { class: 'lock-screen' });
        page.appendChild(el('div', { class: 'lock-logo' }, '🏠'));
        page.appendChild(el('h1', { style: { color: '#fff', marginTop: '14px', letterSpacing: '-1px' } }, 'CasaMorf'));
        page.appendChild(el('p', { style: { color: '#8B93A7', fontSize: '13px', marginTop: '4px' } },
            isFirstTime ? 'Einmalige Einrichtung' : 'Willkommen zurück'));

        const form = el('div', { style: { width: '100%', maxWidth: '340px', marginTop: '24px' } });

        let repoInput, tokenInput;

        if (isFirstTime) {
            // Repo field
            form.appendChild(el('label', { class: 'form-label' }, 'GitHub Repository'));
            repoInput = el('input', { class: 'form-input', placeholder: 'username/casamorf' });
            form.appendChild(repoInput);
            form.appendChild(el('p', { style: { color: '#5C6478', fontSize: '10px', marginTop: '-10px', marginBottom: '14px' } },
                'Format: dein-username/repo-name'));

            // Token field with eye toggle
            form.appendChild(el('label', { class: 'form-label' }, 'GitHub Personal Access Token'));
            const tokenWrap = el('div', { style: { position: 'relative' } });
            tokenInput = el('input', { class: 'form-input', type: 'password', placeholder: 'ghp_xxxxxxxxxxxx', style: { paddingRight: '40px' } });
            const eyeBtn = el('button', {
                class: 'btn-icon',
                style: { position: 'absolute', right: '4px', top: '4px' },
                onClick: () => { tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password'; }
            });
            eyeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
            tokenWrap.appendChild(tokenInput);
            tokenWrap.appendChild(eyeBtn);
            form.appendChild(tokenWrap);
            form.appendChild(el('p', { style: { color: '#5C6478', fontSize: '10px', marginTop: '-10px', marginBottom: '14px', lineHeight: '1.4' } },
                'GitHub → Settings → Developer Settings → Fine-grained tokens\nBerechtigung: Contents Read & Write'));
        }

        // Password field (always shown)
        form.appendChild(el('label', { class: 'form-label' }, 'Verschlüsselungspasswort'));
        const pwWrap = el('div', { style: { position: 'relative' } });
        const pwInput = el('input', { class: 'form-input', type: 'password', placeholder: 'Gemeinsames Passwort', style: { paddingRight: '40px' } });
        const pwEye = el('button', {
            class: 'btn-icon',
            style: { position: 'absolute', right: '4px', top: '4px' },
            onClick: () => { pwInput.type = pwInput.type === 'password' ? 'text' : 'password'; }
        });
        pwEye.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
        pwWrap.appendChild(pwInput);
        pwWrap.appendChild(pwEye);
        form.appendChild(pwWrap);
        form.appendChild(el('p', { style: { color: '#5C6478', fontSize: '10px', marginTop: '-10px', marginBottom: '14px' } },
            'Daten werden damit verschlüsselt. Auf beiden Geräten dasselbe Passwort verwenden!'));

        const errMsg = el('p', { style: { color: '#FF6B8A', fontSize: '12px', textAlign: 'center', marginBottom: '8px', display: 'none' } });
        form.appendChild(errMsg);

        const btn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const pw = pwInput.value.trim();
                if (!pw || pw.length < 4) { errMsg.textContent = 'Passwort min. 4 Zeichen'; errMsg.style.display = 'block'; return; }

                if (isFirstTime) {
                    const token = tokenInput.value.trim();
                    const repo = repoInput.value.trim();
                    if (!token || !repo) { errMsg.textContent = 'Alle Felder ausfüllen'; errMsg.style.display = 'block'; return; }

                    btn.textContent = 'Verbinde...';
                    btn.disabled = true;
                    try {
                        await CasaStore.connect(token, repo);
                        CasaStore.saveCredentials(token, repo);
                    } catch (e) {
                        errMsg.textContent = 'Verbindung fehlgeschlagen. Token & Repo prüfen.';
                        errMsg.style.display = 'block';
                        btn.textContent = 'Verbinden & Weiter';
                        btn.disabled = false;
                        return;
                    }

                    // First time: set password. Returning: unlock.
                    if (!CasaStore.hasPinSet()) {
                        btn.textContent = 'Verschlüssle...';
                        await CasaStore.setPin(pw);
                        await loadAll();
                        render();
                    } else {
                        btn.textContent = 'Entschlüssle...';
                        const ok = await CasaStore.verifyPin(pw);
                        if (!ok) { errMsg.textContent = 'Falsches Passwort'; errMsg.style.display = 'block'; btn.textContent = 'Verbinden & Weiter'; btn.disabled = false; return; }
                        const unlocked = await CasaStore.unlock(pw);
                        if (!unlocked) { errMsg.textContent = 'Entschlüsselung fehlgeschlagen'; errMsg.style.display = 'block'; btn.textContent = 'Verbinden & Weiter'; btn.disabled = false; return; }
                        await loadAll();
                        render();
                    }
                } else {
                    // Returning user: just unlock with password
                    btn.textContent = 'Entschlüssle...';
                    btn.disabled = true;

                    // Connect first if needed
                    if (!CasaStore.isConnected()) {
                        const { token, repo } = CasaStore.getCredentials();
                        try {
                            await CasaStore.connect(token, repo);
                        } catch (e) {
                            errMsg.textContent = 'GitHub-Verbindung fehlgeschlagen';
                            errMsg.style.display = 'block';
                            btn.textContent = 'Entsperren';
                            btn.disabled = false;
                            return;
                        }
                    }

                    if (!CasaStore.hasPinSet()) {
                        // Edge case: credentials saved but no data yet
                        await CasaStore.setPin(pw);
                        await loadAll();
                        render();
                    } else {
                        const ok = await CasaStore.verifyPin(pw);
                        if (!ok) { errMsg.textContent = 'Falsches Passwort'; errMsg.style.display = 'block'; pwInput.value = ''; btn.textContent = 'Entsperren'; btn.disabled = false; return; }
                        const unlocked = await CasaStore.unlock(pw);
                        if (!unlocked) { errMsg.textContent = 'Entschlüsselung fehlgeschlagen'; errMsg.style.display = 'block'; pwInput.value = ''; btn.textContent = 'Entsperren'; btn.disabled = false; return; }
                        await loadAll();
                        render();
                    }
                }
            }
        }, isFirstTime ? 'Verbinden & Weiter' : 'Entsperren');

        pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

        form.appendChild(btn);
        page.appendChild(form);
        container.appendChild(page);
        setTimeout(() => (isFirstTime ? repoInput : pwInput).focus(), 100);
    }

    // ========================================================================
    // USER PICKER (who is using the app right now?)
    // ========================================================================
    function renderUserPicker(container) {
        const page = el('div', { class: 'lock-screen' });
        page.appendChild(el('div', { class: 'lock-logo' }, '🏠'));
        page.appendChild(el('h1', { style: { color: '#fff', marginTop: '14px' } }, 'CasaMorf'));
        page.appendChild(el('p', { style: { color: '#8B93A7', fontSize: '13px', marginTop: '4px' } }, 'Who are you?'));

        const grid = el('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' } });

        if (state.members.length > 0) {
            state.members.forEach(m => {
                const card = el('button', {
                    style: {
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        padding: '18px 24px', borderRadius: '16px', border: '2px solid #262D3D',
                        background: '#1A1F2B', cursor: 'pointer', minWidth: '100px',
                    },
                    onClick: () => {
                        state.currentUser = m;
                        localStorage.setItem('casamorf-current-user', JSON.stringify(m));
                        render();
                    }
                },
                    el('span', { style: { fontSize: '36px' } }, m.avatar),
                    el('span', { style: { fontSize: '14px', color: '#E4E7ED', fontWeight: '600', fontFamily: "'Space Grotesk', sans-serif" } }, m.name),
                );
                grid.appendChild(card);
            });
        }

        // Add new member button
        const addCard = el('button', {
            style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '18px 24px', borderRadius: '16px', border: '2px dashed #333B50',
                background: 'transparent', cursor: 'pointer', minWidth: '100px',
            },
            onClick: () => { state.modal = 'addMember'; renderAddMemberInline(container); }
        },
            el('span', { style: { fontSize: '36px' } }, '➕'),
            el('span', { style: { fontSize: '12px', color: '#5C6478', fontFamily: "'Space Grotesk', sans-serif" } }, 'New member'),
        );
        grid.appendChild(addCard);

        page.appendChild(grid);
        container.appendChild(page);
    }

    function renderAddMemberInline(container) {
        container.innerHTML = '';
        const page = el('div', { class: 'lock-screen' });
        page.appendChild(el('h2', { style: { color: '#fff' } }, 'New member'));

        const form = el('div', { style: { width: '100%', maxWidth: '340px', marginTop: '20px' } });
        let selectedAvatar = '🧑‍💻';

        form.appendChild(el('label', { class: 'form-label' }, 'Avatar'));
        const avatarRow = el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' } });
        AVATARS.forEach(a => {
            const abtn = el('button', {
                style: {
                    width: '42px', height: '42px', borderRadius: '12px', fontSize: '20px',
                    border: `2px solid ${a === selectedAvatar ? '#5AE4A8' : '#262D3D'}`,
                    background: a === selectedAvatar ? 'rgba(90,228,168,0.12)' : '#141820',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                },
                onClick: () => {
                    selectedAvatar = a;
                    avatarRow.querySelectorAll('button').forEach(b => { b.style.border = '2px solid #262D3D'; b.style.background = '#141820'; });
                    abtn.style.border = '2px solid #5AE4A8'; abtn.style.background = 'rgba(90,228,168,0.12)';
                }
            }, a);
            avatarRow.appendChild(abtn);
        });
        form.appendChild(avatarRow);

        form.appendChild(el('label', { class: 'form-label' }, 'Name'));
        const nameInput = el('input', { class: 'form-input', placeholder: 'e.g. Patrick' });

        const btn = el('button', {
            class: 'btn-primary w-full', style: { marginTop: '10px' },
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                const member = { id: uid(), name, avatar: selectedAvatar };
                state.members.push(member);
                state.currentUser = member;
                localStorage.setItem('casamorf-current-user', JSON.stringify(member));
                // Set household name if first member
                if (!state.household) {
                    state.household = { name: 'CasaMorf 🏠', createdAt: new Date().toISOString() };
                }
                await saveAll();
                render();
            }
        }, "Let's go");

        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
        form.appendChild(nameInput);
        form.appendChild(btn);
        page.appendChild(form);
        container.appendChild(page);
        setTimeout(() => nameInput.focus(), 100);
    }

    // ========================================================================
    // HEADER
    // ========================================================================
    function renderHeader() {
        const syncDot = el('div', {
            id: 'sync-dot',
            style: { width: '6px', height: '6px', borderRadius: '50%', background: '#5AE4A8' }
        });

        return el('header', { class: 'header' },
            el('div', { class: 'header-brand' },
                el('div', { class: 'header-logo' }, '🏠'),
                el('div', {},
                    el('div', { class: 'header-title' }, 'CasaMorf'),
                    el('div', { class: 'header-sub flex items-center', style: { gap: '4px' } },
                        syncDot,
                        el('span', {}, state.household?.name || 'not set up'),
                    ),
                ),
            ),
            el('div', { class: 'flex items-center', style: { gap: '4px' } },
                el('button', {
                    class: 'btn-icon',
                    title: 'Sync',
                    onClick: async () => {
                        state.syncing = true;
                        updateSyncIndicator();
                        toast('Syncing...');
                        await CasaStore.refresh();
                        await loadAll();
                        state.syncing = false;
                        render();
                        toast('Synced ✓');
                    }
                }, icon('refresh')),
                el('span', { style: { fontSize: '20px', cursor: 'pointer' }, onClick: () => { state.tab = 'household'; render(); } },
                    state.currentUser?.avatar || '👤'),
            ),
        );
    }

    // ========================================================================
    // NAV
    // ========================================================================
    function renderNav() {
        const openItems = state.items.filter(i => !i.checked).length;
        const openTasks = state.tasks.filter(t => t.status === 'open').length;
        const tabs = [
            { id: 'dashboard', ic: 'home', label: 'Home' },
            { id: 'shopping', ic: 'cart', label: 'Shop', badge: openItems },
            { id: 'tasks', ic: 'tasks', label: 'Tasks', badge: openTasks },
            { id: 'household', ic: 'users', label: 'Crib' },
        ];
        const nav = el('nav', { class: 'bottom-nav' });
        tabs.forEach(t => {
            const item = el('button', {
                class: `nav-item${state.tab === t.id ? ' active' : ''}`,
                onClick: () => { state.tab = t.id; render(); }
            });
            const iconWrap = el('div', { style: { position: 'relative' } });
            iconWrap.innerHTML = icons[t.ic];
            if (t.badge > 0) iconWrap.appendChild(el('span', { class: 'nav-badge' }, String(t.badge)));
            item.appendChild(iconWrap);
            item.appendChild(el('span', { class: 'label' }, t.label));
            if (state.tab === t.id) item.appendChild(el('div', { class: 'nav-dot' }));
            nav.appendChild(item);
        });
        return nav;
    }

    // ========================================================================
    // DASHBOARD
    // ========================================================================
    function renderDashboard(container) {
        const page = el('div', { class: 'page' });
        const unchecked = state.items.filter(i => !i.checked);
        const openTasks = state.tasks.filter(t => t.status === 'open');
        const doneToday = state.tasks.filter(t => t.status === 'done' && t.completedAt &&
            new Date(t.completedAt).toDateString() === new Date().toDateString()).length;

        // Greeting
        page.appendChild(el('h2', { style: { color: '#fff', fontSize: '22px' } },
            `Hey ${state.currentUser?.name || ''} ${state.currentUser?.avatar || ''}`));
        page.appendChild(el('p', { class: 'text-sec', style: { fontSize: '13px', marginTop: '2px', marginBottom: '16px' } },
            new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })));

        // Stats
        const stats = el('div', { class: 'stats-grid' });
        stats.appendChild(renderStat(icons.cart, unchecked.length, 'Shopping', '#47C9FF', 'rgba(71,201,255,0.12)', () => { state.tab = 'shopping'; render(); }));
        stats.appendChild(renderStat(icons.alert, openTasks.length, 'Offen', '#FF6B8A', 'rgba(255,107,138,0.12)', () => { state.tab = 'tasks'; render(); }));
        stats.appendChild(renderStat(icons.flame, doneToday, 'Heute erledigt', '#5AE4A8', 'rgba(90,228,168,0.12)'));
        page.appendChild(stats);

        // Shopping preview
        if (unchecked.length > 0) {
            const sec = renderSection('Einkaufsliste', unchecked.length, () => { state.tab = 'shopping'; render(); });
            unchecked.slice(0, 4).forEach(item => {
                const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[8];
                sec.appendChild(renderItemRow(item, cat, true));
            });
            if (unchecked.length > 4) sec.appendChild(el('button', { class: 'btn-link', style: { marginTop: '4px' }, onClick: () => { state.tab = 'shopping'; render(); } }, `+${unchecked.length - 4} mehr `, icon('chevron')));
            page.appendChild(sec);
        }

        // Task preview
        if (openTasks.length > 0) {
            const sec = renderSection('Offene Tasks', openTasks.length, () => { state.tab = 'tasks'; render(); });
            openTasks.slice(0, 3).forEach(task => sec.appendChild(renderTaskRow(task)));
            page.appendChild(sec);
        }

        if (unchecked.length === 0 && openTasks.length === 0) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.innerHTML = icons.sparkles;
            card.appendChild(el('p', { class: 'text-sec', style: { fontSize: '14px', marginTop: '10px' } }, 'Alles erledigt! 🎉'));
            page.appendChild(card);
        }

        container.appendChild(page);
    }

    function renderStat(iconHtml, value, label, color, glow, onClick) {
        const card = el('div', { class: 'stat-card', onClick: onClick || (() => {}) });
        card.appendChild(el('div', { class: 'glow', style: { background: glow } }));
        const ic = el('div', { style: { color, marginBottom: '4px' } }); ic.innerHTML = iconHtml; card.appendChild(ic);
        card.appendChild(el('div', { class: 'value' }, String(value)));
        card.appendChild(el('div', { class: 'label' }, label));
        return card;
    }

    function renderSection(title, count, onMore) {
        const sec = el('div', { class: 'section' });
        const header = el('div', { class: 'section-header' });
        const left = el('div', { class: 'flex items-center' });
        left.appendChild(el('h3', {}, title));
        if (count !== undefined) left.appendChild(el('span', { class: 'section-count' }, String(count)));
        header.appendChild(left);
        if (onMore) header.appendChild(el('button', { class: 'btn-link', onClick: onMore }, 'Alle ', icon('chevron')));
        sec.appendChild(header);
        return sec;
    }

    // ========================================================================
    // SHOPPING LIST
    // ========================================================================
    function renderShopping(container) {
        const page = el('div', { class: 'page' });
        const unchecked = state.items.filter(i => !i.checked);
        const checked = state.items.filter(i => i.checked);

        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '14px' } });
        hdr.appendChild(el('h2', { style: { color: '#fff' } }, 'Einkaufsliste'));
        const addBtn = el('button', { class: 'btn-add', onClick: () => { state.modal = 'addItem'; render(); } });
        addBtn.innerHTML = icons.plus;
        hdr.appendChild(addBtn);
        page.appendChild(hdr);

        if (unchecked.length === 0 && checked.length === 0) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.appendChild(el('div', { style: { fontSize: '28px' } }, '🛒'));
            card.appendChild(el('p', { class: 'text-sec', style: { marginTop: '10px' } }, 'Liste ist leer'));
            card.appendChild(el('button', { class: 'btn-primary', style: { marginTop: '10px', fontSize: '13px' }, onClick: () => { state.modal = 'addItem'; render(); } }, icon('plus'), ' Hinzufügen'));
            page.appendChild(card);
        }

        // Group by category
        const grouped = {};
        unchecked.forEach(i => { const c = i.category || 'sonstiges'; if (!grouped[c]) grouped[c] = []; grouped[c].push(i); });

        CATEGORIES.filter(c => grouped[c.id]).forEach(cat => {
            const catSec = el('div', { style: { marginBottom: '14px' } });
            catSec.appendChild(el('div', { class: 'flex items-center', style: { gap: '5px', marginBottom: '5px' } },
                el('span', { style: { fontSize: '13px' } }, cat.icon),
                el('span', { style: { fontSize: '11px', fontWeight: '600', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' } }, cat.label),
            ));
            grouped[cat.id].forEach(item => catSec.appendChild(renderItemRow(item, cat)));
            page.appendChild(catSec);
        });

        // Checked items
        if (checked.length > 0) {
            const sec = el('div', { style: { marginTop: '16px' } });
            const hdr2 = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '6px' } });
            hdr2.appendChild(el('span', { class: 'text-muted', style: { fontSize: '12px' } }, `✓ Erledigt (${checked.length})`));
            hdr2.appendChild(el('button', {
                class: 'btn-link', style: { color: '#FF6B8A', fontSize: '11px' },
                onClick: async () => { state.items = state.items.filter(i => !i.checked); await saveAll(); toast(`${checked.length} entfernt`); render(); }
            }, icon('trash'), ' Leeren'));
            sec.appendChild(hdr2);
            checked.forEach(item => {
                const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[8];
                const row = el('div', { class: 'row faded', onClick: async () => { item.checked = false; await saveAll(); render(); } });
                const chk = el('div', { class: 'check done' }); chk.innerHTML = icons.check;
                row.appendChild(chk);
                row.appendChild(el('span', { class: 'flex-1 text-muted text-strike', style: { fontSize: '14px' } }, `${cat.icon} ${item.name}`));
                sec.appendChild(row);
            });
            page.appendChild(sec);
        }

        // FAB
        const fab = el('button', { class: 'fab', onClick: () => { state.modal = 'addItem'; render(); } });
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
        page.appendChild(fab);
        container.appendChild(page);
    }

    function renderItemRow(item, cat, compact) {
        const row = el('div', { class: 'row' });
        const left = el('div', {
            class: 'flex items-center flex-1', style: { gap: '10px', cursor: 'pointer' },
            onClick: async () => { item.checked = !item.checked; item.checkedBy = item.checked ? state.currentUser?.name : null; await saveAll(); render(); }
        });
        left.appendChild(el('div', { class: 'check', style: { borderColor: cat.color } }));
        const content = el('div', { class: 'flex-1' });
        content.appendChild(el('span', { style: { fontSize: '14px', color: '#E4E7ED' } }, `${cat.icon} ${item.name}`));
        if (item.note) content.appendChild(el('p', { style: { fontSize: '11px', color: '#5C6478', marginTop: '1px' } }, item.note));
        left.appendChild(content);
        if (item.quantity > 1) left.appendChild(el('span', { style: { fontSize: '11px', color: '#5C6478', background: '#141820', padding: '1px 7px', borderRadius: '7px' } }, `×${item.quantity}`));
        row.appendChild(left);
        if (!compact) {
            const del = el('button', { class: 'btn-icon', onClick: async (e) => { e.stopPropagation(); state.items = state.items.filter(i => i.id !== item.id); await saveAll(); render(); } });
            del.innerHTML = icons.trash;
            row.appendChild(del);
        }
        return row;
    }

    // ========================================================================
    // TASKS
    // ========================================================================
    function renderTasks(container) {
        const page = el('div', { class: 'page' });
        const open = state.tasks.filter(t => t.status === 'open');
        const done = state.tasks.filter(t => t.status === 'done');

        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '14px' } });
        hdr.appendChild(el('h2', { style: { color: '#fff' } }, 'Aufgaben'));
        const addBtn = el('button', { class: 'btn-add', onClick: () => { state.modal = 'addTask'; render(); } });
        addBtn.innerHTML = icons.plus;
        hdr.appendChild(addBtn);
        page.appendChild(hdr);

        if (open.length === 0 && done.length === 0) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.innerHTML = icons.sparkles;
            card.appendChild(el('p', { class: 'text-sec', style: { marginTop: '10px' } }, 'Keine Aufgaben'));
            card.appendChild(el('button', { class: 'btn-primary', style: { marginTop: '10px', fontSize: '13px' }, onClick: () => { state.modal = 'addTask'; render(); } }, icon('plus'), ' Erstellen'));
            page.appendChild(card);
        }

        if (open.length > 0) { const sec = renderSection('Offen', open.length); open.forEach(t => sec.appendChild(renderTaskRow(t))); page.appendChild(sec); }
        if (done.length > 0) { const sec = renderSection('Erledigt', done.length); done.slice(0, 10).forEach(t => sec.appendChild(renderTaskRow(t, true))); page.appendChild(sec); }

        const fab = el('button', { class: 'fab', onClick: () => { state.modal = 'addTask'; render(); } });
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
        page.appendChild(fab);
        container.appendChild(page);
    }

    function renderTaskRow(task, isDone) {
        const freq = FREQUENCIES.find(f => f.id === task.frequency);
        const row = el('div', { class: `row${isDone ? ' faded' : ''}` });
        const left = el('div', {
            class: 'flex items-center flex-1', style: { gap: '10px', cursor: 'pointer' },
            onClick: async () => {
                task.status = task.status === 'open' ? 'done' : 'open';
                task.completedAt = task.status === 'done' ? new Date().toISOString() : null;
                task.completedBy = task.status === 'done' ? state.currentUser?.name : null;
                await saveAll();
                render();
            }
        });
        const chk = el('div', { class: `check${isDone ? ' done' : ''}` });
        if (isDone) chk.innerHTML = icons.check;
        left.appendChild(chk);
        const content = el('div', { class: 'flex-1' });
        content.appendChild(el('span', { style: { fontSize: '14px', color: isDone ? '#5C6478' : '#E4E7ED', textDecoration: isDone ? 'line-through' : 'none' } }, task.name));
        const meta = el('div', { class: 'flex items-center', style: { gap: '6px', marginTop: '2px' } });
        if (task.assignedTo) meta.appendChild(el('span', { style: { fontSize: '11px', color: '#8B93A7' } }, `→ ${task.assignedTo}`));
        if (task.frequency !== 'once') { const rep = el('span', { style: { fontSize: '10px', color: '#5AE4A8', display: 'flex', alignItems: 'center', gap: '2px' } }); rep.innerHTML = icons.repeat; rep.appendChild(document.createTextNode(` ${freq?.short || ''}`)); meta.appendChild(rep); }
        if (isDone && task.completedBy) meta.appendChild(el('span', { style: { fontSize: '10px', color: '#5C6478' } }, `${task.completedBy} · ${fmtDate(task.completedAt)}`));
        content.appendChild(meta);
        left.appendChild(content);
        row.appendChild(left);
        const del = el('button', { class: 'btn-icon', onClick: async (e) => { e.stopPropagation(); state.tasks = state.tasks.filter(t => t.id !== task.id); await saveAll(); render(); } });
        del.innerHTML = icons.trash;
        row.appendChild(del);
        return row;
    }

    // ========================================================================
    // HOUSEHOLD
    // ========================================================================
    function renderHousehold(container) {
        const page = el('div', { class: 'page' });
        page.appendChild(el('h2', { style: { color: '#fff', marginBottom: '14px' } }, 'Haushalt'));

        // Members
        const sec = renderSection('Mitglieder', state.members.length);
        state.members.forEach(m => {
            const row = el('div', { class: 'row', style: { padding: '12px' } });
            row.appendChild(el('span', { style: { fontSize: '26px' } }, m.avatar));
            const info = el('div', { class: 'flex-1' });
            const nameRow = el('div', { class: 'flex items-center', style: { gap: '6px' } });
            nameRow.appendChild(el('span', { style: { fontSize: '14px', fontWeight: '500', color: '#E4E7ED' } }, m.name));
            if (state.currentUser?.id === m.id) nameRow.appendChild(el('span', { style: { fontSize: '9px', color: '#5AE4A8', background: 'rgba(90,228,168,0.1)', padding: '1px 6px', borderRadius: '6px', fontWeight: '700' } }, 'YOU'));
            info.appendChild(nameRow);
            row.appendChild(info);
            // Edit button
            const editBtn = el('button', {
                class: 'btn-icon',
                onClick: () => { state.modal = 'editMember'; state.editMemberId = m.id; render(); }
            });
            editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
            row.appendChild(editBtn);
            sec.appendChild(row);
        });
        // Add member button
        sec.appendChild(el('button', {
            class: 'btn-primary w-full', style: { marginTop: '8px', fontSize: '13px' },
            onClick: () => { state.currentUser = null; render(); }
        }, icon('plus'), ' Mitglied hinzufügen'));
        page.appendChild(sec);

        // Backup
        const backupSec = renderSection('Backup & Settings');
        backupSec.appendChild(el('button', {
            class: 'btn-primary w-full',
            onClick: () => {
                const json = CasaStore.exportAll();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = el('a', { href: url, download: `casamorf-backup-${new Date().toISOString().slice(0, 10)}.json` });
                a.click(); URL.revokeObjectURL(url);
                toast('Backup gespeichert');
            }
        }, icon('download'), ' Backup exportieren'));
        backupSec.appendChild(el('button', {
            class: 'btn-primary w-full', style: { marginTop: '8px', background: '#FF6B8A' },
            onClick: () => { CasaStore.clearCredentials(); location.reload(); }
        }, icon('settings'), ' GitHub Verbindung zurücksetzen'));
        page.appendChild(backupSec);

        container.appendChild(page);
    }

    // ========================================================================
    // ADD ITEM MODAL
    // ========================================================================
    function renderAddItemModal() {
        const overlay = el('div', { class: 'modal-overlay', onClick: () => { state.modal = null; render(); } });
        const sheet = el('div', { class: 'modal-sheet', onClick: e => e.stopPropagation() });
        sheet.appendChild(el('div', { class: 'modal-handle' }));

        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '16px' } });
        hdr.appendChild(el('h3', { style: { color: '#fff' } }, 'Artikel hinzufügen'));
        const closeBtn = el('button', { class: 'btn-icon', onClick: () => { state.modal = null; render(); } }); closeBtn.innerHTML = icons.x;
        hdr.appendChild(closeBtn);
        sheet.appendChild(hdr);

        let selectedCat = 'sonstiges';
        let qty = 1;

        sheet.appendChild(el('label', { class: 'form-label' }, 'Artikel'));
        const nameInput = el('input', { class: 'form-input', placeholder: 'z.B. Milch, Brot, Zahnpasta...' });
        sheet.appendChild(nameInput);

        sheet.appendChild(el('label', { class: 'form-label' }, 'Kategorie'));
        const catGrid = el('div', { class: 'cat-grid' });
        CATEGORIES.forEach(c => {
            const btn = el('button', {
                class: 'cat-btn',
                style: c.id === selectedCat ? { borderColor: c.color, background: c.color + '18', color: c.color } : {},
                onClick: () => {
                    selectedCat = c.id;
                    catGrid.querySelectorAll('button').forEach(b => { b.style.borderColor = '#262D3D'; b.style.background = '#141820'; b.style.color = '#8B93A7'; });
                    btn.style.borderColor = c.color; btn.style.background = c.color + '18'; btn.style.color = c.color;
                }
            }, `${c.icon} ${c.label}`);
            catGrid.appendChild(btn);
        });
        sheet.appendChild(catGrid);

        const row = el('div', { class: 'flex', style: { gap: '10px', marginBottom: '14px' } });
        const qtyWrap = el('div', { style: { flex: '1' } });
        qtyWrap.appendChild(el('label', { class: 'form-label' }, 'Menge'));
        const qtyRow = el('div', { class: 'flex items-center', style: { gap: '6px' } });
        const qtyDisplay = el('span', { style: { fontSize: '18px', fontWeight: '600', color: '#fff', width: '28px', textAlign: 'center' } }, '1');
        qtyRow.appendChild(el('button', { class: 'qty-btn', onClick: () => { qty = Math.max(1, qty - 1); qtyDisplay.textContent = qty; } }, '−'));
        qtyRow.appendChild(qtyDisplay);
        qtyRow.appendChild(el('button', { class: 'qty-btn', onClick: () => { qty++; qtyDisplay.textContent = qty; } }, '+'));
        qtyWrap.appendChild(qtyRow); row.appendChild(qtyWrap);

        const noteWrap = el('div', { style: { flex: '2' } });
        noteWrap.appendChild(el('label', { class: 'form-label' }, 'Notiz'));
        const noteInput = el('input', { class: 'form-input', placeholder: 'Bio, 500ml...' });
        noteWrap.appendChild(noteInput); row.appendChild(noteWrap);
        sheet.appendChild(row);

        const submitBtn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                state.items.unshift({ id: uid(), name, category: selectedCat, quantity: qty, note: noteInput.value.trim(), checked: false, addedAt: new Date().toISOString(), addedBy: state.currentUser?.name });
                await saveAll();
                state.modal = null;
                toast(`${name} hinzugefügt`);
                render();
            }
        }, icon('cart'), ' Hinzufügen');

        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });
        sheet.appendChild(submitBtn);
        overlay.appendChild(sheet);
        setTimeout(() => nameInput.focus(), 150);
        return overlay;
    }

    // ========================================================================
    // ADD TASK MODAL
    // ========================================================================
    function renderAddTaskModal() {
        const overlay = el('div', { class: 'modal-overlay', onClick: () => { state.modal = null; render(); } });
        const sheet = el('div', { class: 'modal-sheet', onClick: e => e.stopPropagation() });
        sheet.appendChild(el('div', { class: 'modal-handle' }));

        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '16px' } });
        hdr.appendChild(el('h3', { style: { color: '#fff' } }, 'Neue Aufgabe'));
        const closeBtn = el('button', { class: 'btn-icon', onClick: () => { state.modal = null; render(); } }); closeBtn.innerHTML = icons.x;
        hdr.appendChild(closeBtn);
        sheet.appendChild(hdr);

        let selectedFreq = 'once';
        let assignedTo = '';

        sheet.appendChild(el('label', { class: 'form-label' }, 'Aufgabe'));
        const nameInput = el('input', { class: 'form-input', placeholder: 'z.B. Küche putzen, Wäsche...' });
        sheet.appendChild(nameInput);

        sheet.appendChild(el('label', { class: 'form-label' }, 'Wiederholen'));
        const freqRow = el('div', { class: 'flex', style: { gap: '5px', flexWrap: 'wrap', marginBottom: '14px' } });
        FREQUENCIES.forEach(f => {
            const btn = el('button', {
                class: 'pill' + (f.id === selectedFreq ? ' active' : ''),
                onClick: () => { selectedFreq = f.id; freqRow.querySelectorAll('button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            });
            if (f.id !== 'once') btn.innerHTML = icons.repeat + ' ';
            btn.appendChild(document.createTextNode(f.label));
            freqRow.appendChild(btn);
        });
        sheet.appendChild(freqRow);

        if (state.members.length > 0) {
            sheet.appendChild(el('label', { class: 'form-label' }, 'Zuweisen an'));
            const assignRow = el('div', { class: 'flex', style: { gap: '5px', flexWrap: 'wrap', marginBottom: '14px' } });
            const nobodyBtn = el('button', { class: 'pill active', onClick: () => { assignedTo = ''; assignRow.querySelectorAll('button').forEach(b => b.classList.remove('active')); nobodyBtn.classList.add('active'); } }, 'Niemand');
            assignRow.appendChild(nobodyBtn);
            state.members.forEach(m => {
                const btn = el('button', { class: 'pill', onClick: () => { assignedTo = m.name; assignRow.querySelectorAll('button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); } }, `${m.avatar} ${m.name}`);
                assignRow.appendChild(btn);
            });
            sheet.appendChild(assignRow);
        }

        const submitBtn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                state.tasks.unshift({ id: uid(), name, frequency: selectedFreq, assignedTo: assignedTo || null, status: 'open', createdAt: new Date().toISOString(), createdBy: state.currentUser?.name });
                await saveAll();
                state.modal = null;
                toast('Aufgabe erstellt');
                render();
            }
        }, icon('check'), ' Erstellen');

        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });
        sheet.appendChild(submitBtn);
        overlay.appendChild(sheet);
        setTimeout(() => nameInput.focus(), 150);
        return overlay;
    }

    // ========================================================================
    // EDIT MEMBER MODAL
    // ========================================================================
    function renderEditMemberModal() {
        const member = state.members.find(m => m.id === state.editMemberId);
        if (!member) { state.modal = null; return el('div'); }

        const overlay = el('div', { class: 'modal-overlay', onClick: () => { state.modal = null; render(); } });
        const sheet = el('div', { class: 'modal-sheet', onClick: e => e.stopPropagation() });
        sheet.appendChild(el('div', { class: 'modal-handle' }));

        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '16px' } });
        hdr.appendChild(el('h3', { style: { color: '#fff' } }, 'Mitglied bearbeiten'));
        const closeBtn = el('button', { class: 'btn-icon', onClick: () => { state.modal = null; render(); } }); closeBtn.innerHTML = icons.x;
        hdr.appendChild(closeBtn);
        sheet.appendChild(hdr);

        let selectedAvatar = member.avatar;

        // Avatar picker
        sheet.appendChild(el('label', { class: 'form-label' }, 'Avatar'));
        const avatarRow = el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' } });
        AVATARS.forEach(a => {
            const abtn = el('button', {
                style: {
                    width: '42px', height: '42px', borderRadius: '12px', fontSize: '20px',
                    border: `2px solid ${a === selectedAvatar ? '#5AE4A8' : '#262D3D'}`,
                    background: a === selectedAvatar ? 'rgba(90,228,168,0.12)' : '#141820',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                },
                onClick: () => {
                    selectedAvatar = a;
                    avatarRow.querySelectorAll('button').forEach(b => { b.style.border = '2px solid #262D3D'; b.style.background = '#141820'; });
                    abtn.style.border = '2px solid #5AE4A8'; abtn.style.background = 'rgba(90,228,168,0.12)';
                }
            }, a);
            avatarRow.appendChild(abtn);
        });
        sheet.appendChild(avatarRow);

        // Name
        sheet.appendChild(el('label', { class: 'form-label' }, 'Name'));
        const nameInput = el('input', { class: 'form-input', value: member.name });
        sheet.appendChild(nameInput);

        // Save button
        const saveBtn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                const oldName = member.name;
                member.name = name;
                member.avatar = selectedAvatar;
                // Update currentUser if editing self
                if (state.currentUser?.id === member.id) {
                    state.currentUser = member;
                    localStorage.setItem('casamorf-current-user', JSON.stringify(member));
                }
                // Update name references in tasks
                state.tasks.forEach(t => {
                    if (t.assignedTo === oldName) t.assignedTo = name;
                    if (t.createdBy === oldName) t.createdBy = name;
                    if (t.completedBy === oldName) t.completedBy = name;
                });
                state.items.forEach(i => {
                    if (i.addedBy === oldName) i.addedBy = name;
                    if (i.checkedBy === oldName) i.checkedBy = name;
                });
                await saveAll();
                state.modal = null;
                toast(`${name} aktualisiert`);
                render();
            }
        }, icon('check'), ' Speichern');
        sheet.appendChild(saveBtn);

        // Delete button (only if not the last member)
        if (state.members.length > 1) {
            sheet.appendChild(el('button', {
                class: 'btn-primary w-full',
                style: { marginTop: '10px', background: '#FF6B8A' },
                onClick: async () => {
                    if (!confirm(`"${member.name}" wirklich entfernen?`)) return;
                    state.members = state.members.filter(m => m.id !== member.id);
                    if (state.currentUser?.id === member.id) {
                        state.currentUser = state.members[0];
                        localStorage.setItem('casamorf-current-user', JSON.stringify(state.currentUser));
                    }
                    await saveAll();
                    state.modal = null;
                    toast('Mitglied entfernt');
                    render();
                }
            }, icon('trash'), ' Entfernen'));
        }

        overlay.appendChild(sheet);
        setTimeout(() => nameInput.focus(), 150);
        return overlay;
    }

    // ========================================================================
    // INIT
    // ========================================================================
    async function init() {
        if (CasaStore.hasCredentials()) {
            const { token, repo } = CasaStore.getCredentials();
            try {
                await CasaStore.connect(token, repo);

                // Auto-unlock with saved password (no prompt needed)
                const savedPw = CasaStore.getSavedPassword();
                if (savedPw && CasaStore.hasPinSet()) {
                    const ok = await CasaStore.verifyPin(savedPw);
                    if (ok) {
                        const unlocked = await CasaStore.unlock(savedPw);
                        if (unlocked) {
                            await loadAll();
                            console.log("Auto-unlock OK");
                        }
                    }
                } else if (savedPw && !CasaStore.hasPinSet()) {
                    // Has saved pw but no pin set yet — set it now
                    await CasaStore.setPin(savedPw);
                    await loadAll();
                }
            } catch (e) {
                console.error("Auto-connect failed:", e);
            }
        }
        render();
    }

    // Called after successful PIN unlock to hydrate state
    async function loadAll() {
        state.household = await CasaStore.load('household', null);
        state.members = await CasaStore.load('members', []);
        state.items = await CasaStore.load('items', []);
        state.tasks = await CasaStore.load('tasks', []);
        // Restore current user from localStorage
        const saved = localStorage.getItem('casamorf-current-user');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const found = state.members.find(m => m.id === parsed.id);
                if (found) state.currentUser = found;
            } catch (e) {}
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
