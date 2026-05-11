// ============================================================================
// CasaMorf — Main Application (Vanilla JS, no framework)
// Same architecture as evChargeTracker: pure HTML/CSS/JS, GitHub Pages
// All data encrypted with AES-256-GCM via passphrase
// ============================================================================

const App = (() => {
    // ========================================================================
    // STATE
    // ========================================================================
    let state = {
        user: null,
        household: null,
        items: [],
        tasks: [],
        tab: 'dashboard',
        modal: null,
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
        { id: 'biweekly', label: 'Alle 2 Wochen', short: '2w' },
        { id: 'monthly', label: 'Monatlich', short: '1m' },
        { id: 'once', label: 'Einmalig', short: '1x' },
    ];

    const AVATARS = ['🧑‍💻', '👩‍🍳', '🧑‍🎨', '👨‍🔧', '👩‍💼', '🧑‍🏫', '🦊', '🐱', '🐻', '🦉'];

    // ========================================================================
    // HELPERS
    // ========================================================================
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
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
        if (h < 1) return 'just now';
        if (h < 24) return `${Math.floor(h)}h ago`;
        if (h < 48) return 'yesterday';
        return new Date(d).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
    }

    // Lucide-style SVG icons (inline, no dependency)
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
        logout: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>',
        lock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        userplus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>',
        download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
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
    // SAVE / LOAD
    // ========================================================================
    async function saveAll() {
        await CasaStore.save('user', state.user);
        await CasaStore.save('household', state.household);
        await CasaStore.save('items', state.items);
        await CasaStore.save('tasks', state.tasks);
    }

    async function loadAll() {
        state.user = await CasaStore.load('user', null);
        state.household = await CasaStore.load('household', null);
        state.items = await CasaStore.load('items', []);
        state.tasks = await CasaStore.load('tasks', []);
    }

    // ========================================================================
    // TOAST
    // ========================================================================
    function toast(msg) {
        const existing = $('.toast');
        if (existing) existing.remove();
        const t = el('div', { class: 'toast' }, icon('check'), msg);
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2200);
    }

    // ========================================================================
    // RENDER ENGINE
    // ========================================================================
    function render() {
        const app = $('#app');
        app.innerHTML = '';

        if (!CasaStore.isUnlocked()) {
            renderLockScreen(app);
            return;
        }

        if (!state.user) {
            renderAuth(app);
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

        // Modal
        if (state.modal === 'addItem') app.appendChild(renderAddItemModal());
        if (state.modal === 'addTask') app.appendChild(renderAddTaskModal());
    }

    // ========================================================================
    // LOCK SCREEN (Passphrase)
    // ========================================================================
    function renderLockScreen(container) {
        const isNew = !CasaStore.hasData();
        const page = el('div', { class: 'lock-screen' });

        page.appendChild(el('div', { class: 'lock-logo' }, '🏠'));
        page.appendChild(el('h1', { style: { color: '#fff', marginTop: '14px', letterSpacing: '-1px' } }, 'CasaMorf'));
        page.appendChild(el('p', { style: { color: '#8B93A7', fontSize: '14px', marginTop: '4px' } },
            isNew ? 'Choose a passphrase to encrypt your data.' : 'Enter your passphrase to unlock.'));

        const form = el('div', { style: { width: '100%', maxWidth: '340px', marginTop: '28px' } });

        const input = el('input', {
            class: 'form-input',
            type: 'password',
            placeholder: isNew ? 'New passphrase...' : 'Passphrase...',
            style: { textAlign: 'center' },
        });

        const errMsg = el('p', { style: { color: '#FF6B8A', fontSize: '12px', textAlign: 'center', marginBottom: '8px', display: 'none' } }, 'Wrong passphrase.');

        const btn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const pass = input.value.trim();
                if (!pass) return;
                if (!isNew) {
                    const ok = await CasaStore.verifyPassphrase(pass);
                    if (!ok) { errMsg.style.display = 'block'; input.value = ''; return; }
                }
                await CasaStore.unlock(pass);
                await loadAll();
                render();
            }
        }, icon('lock'), isNew ? 'Create & Encrypt' : 'Unlock');

        input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

        form.appendChild(input);
        form.appendChild(errMsg);
        form.appendChild(btn);

        if (!isNew) {
            form.appendChild(el('p', { style: { color: '#5C6478', fontSize: '11px', textAlign: 'center', marginTop: '12px' } },
                '🔒 AES-256-GCM encrypted. Data stays on your device.'));
        }

        page.appendChild(form);
        container.appendChild(page);
        setTimeout(() => input.focus(), 100);
    }

    // ========================================================================
    // AUTH (Name + Avatar)
    // ========================================================================
    function renderAuth(container) {
        const page = el('div', { class: 'lock-screen' });
        page.appendChild(el('div', { class: 'lock-logo' }, '🏠'));
        page.appendChild(el('h1', { style: { color: '#fff', marginTop: '14px' } }, 'CasaMorf'));
        page.appendChild(el('p', { style: { color: '#8B93A7', fontSize: '14px', marginTop: '4px' } }, 'your household, organized.'));

        const form = el('div', { style: { width: '100%', maxWidth: '340px', marginTop: '28px' } });
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
                    avatarRow.querySelectorAll('button').forEach(b => {
                        b.style.border = '2px solid #262D3D';
                        b.style.background = '#141820';
                    });
                    abtn.style.border = '2px solid #5AE4A8';
                    abtn.style.background = 'rgba(90,228,168,0.12)';
                }
            }, a);
            avatarRow.appendChild(abtn);
        });
        form.appendChild(avatarRow);

        form.appendChild(el('label', { class: 'form-label' }, 'Name'));
        const nameInput = el('input', { class: 'form-input', placeholder: 'e.g. Patrick' });

        const submitBtn = el('button', {
            class: 'btn-primary w-full',
            style: { marginTop: '14px' },
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                state.user = { id: uid(), name, avatar: selectedAvatar, createdAt: new Date().toISOString() };
                await saveAll();
                render();
            }
        }, "Let's go");

        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });

        form.appendChild(nameInput);
        form.appendChild(submitBtn);
        page.appendChild(form);
        container.appendChild(page);
        setTimeout(() => nameInput.focus(), 100);
    }

    // ========================================================================
    // HEADER
    // ========================================================================
    function renderHeader() {
        return el('header', { class: 'header' },
            el('div', { class: 'header-brand' },
                el('div', { class: 'header-logo' }, '🏠'),
                el('div', {},
                    el('div', { class: 'header-title' }, 'CasaMorf'),
                    el('div', { class: 'header-sub' }, state.household?.name || 'no household yet'),
                ),
            ),
            el('button', {
                class: 'btn-icon',
                onClick: async () => {
                    // Export encrypted backup
                    const json = CasaStore.exportAll();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = el('a', { href: url, download: `casamorf-backup-${new Date().toISOString().slice(0, 10)}.json` });
                    a.click();
                    URL.revokeObjectURL(url);
                    toast('Encrypted backup saved');
                }
            }, icon('download')),
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

        // No household
        if (!state.household) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.appendChild(el('div', { style: { fontSize: '36px' } }, '👋'));
            card.appendChild(el('h2', { style: { color: '#fff', marginTop: '10px' } }, `Welcome, ${state.user.name}!`));
            card.appendChild(el('p', { class: 'text-sec', style: { fontSize: '13px', marginTop: '6px' } }, 'Create your crib to get started.'));
            card.appendChild(renderInlineCreate());
            page.appendChild(card);
            container.appendChild(page);
            return;
        }

        // Greeting
        page.appendChild(el('h2', { style: { color: '#fff', fontSize: '22px' } }, `Hey ${state.user.name} ${state.user.avatar}`));
        page.appendChild(el('p', { class: 'text-sec', style: { fontSize: '13px', marginTop: '2px', marginBottom: '16px' } },
            new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })));

        // Stats
        const stats = el('div', { class: 'stats-grid' });
        stats.appendChild(renderStat(icons.cart, unchecked.length, 'Shopping', '#47C9FF', 'rgba(71,201,255,0.12)', () => { state.tab = 'shopping'; render(); }));
        stats.appendChild(renderStat(icons.alert, openTasks.length, 'Open', '#FF6B8A', 'rgba(255,107,138,0.12)', () => { state.tab = 'tasks'; render(); }));
        stats.appendChild(renderStat(icons.flame, doneToday, 'Done today', '#5AE4A8', 'rgba(90,228,168,0.12)'));
        page.appendChild(stats);

        // Shopping preview
        if (unchecked.length > 0) {
            const sec = renderSection('Shopping list', unchecked.length, () => { state.tab = 'shopping'; render(); });
            unchecked.slice(0, 4).forEach(item => {
                const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[8];
                sec.appendChild(renderItemRow(item, cat, true));
            });
            if (unchecked.length > 4) {
                sec.appendChild(el('button', {
                    class: 'btn-link', style: { marginTop: '4px' },
                    onClick: () => { state.tab = 'shopping'; render(); }
                }, `+${unchecked.length - 4} more `, icon('chevron')));
            }
            page.appendChild(sec);
        }

        // Tasks preview
        if (openTasks.length > 0) {
            const sec = renderSection('Open tasks', openTasks.length, () => { state.tab = 'tasks'; render(); });
            openTasks.slice(0, 3).forEach(task => sec.appendChild(renderTaskRow(task)));
            page.appendChild(sec);
        }

        // All clear
        if (unchecked.length === 0 && openTasks.length === 0) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.innerHTML = icons.sparkles;
            card.appendChild(el('p', { class: 'text-sec', style: { fontSize: '14px', marginTop: '10px' } }, 'All caught up! 🎉'));
            page.appendChild(card);
        }

        // Members
        if (state.household.members.length > 0) {
            const sec = renderSection('Crib members');
            const row = el('div', { style: { display: 'flex', gap: '8px' } });
            state.household.members.forEach(m => {
                row.appendChild(el('div', { class: 'member-chip' },
                    el('span', { style: { fontSize: '18px' } }, m.avatar),
                    el('span', { style: { fontSize: '11px', color: '#E4E7ED' } }, m.name),
                ));
            });
            sec.appendChild(row);
            page.appendChild(sec);
        }

        container.appendChild(page);
    }

    function renderStat(iconHtml, value, label, color, glow, onClick) {
        const card = el('div', { class: 'stat-card', onClick: onClick || (() => {}) });
        const glowEl = el('div', { class: 'glow', style: { background: glow } });
        card.appendChild(glowEl);
        const iconEl = el('div', { style: { color, marginBottom: '4px' } });
        iconEl.innerHTML = iconHtml;
        card.appendChild(iconEl);
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
        if (onMore) {
            header.appendChild(el('button', { class: 'btn-link', onClick: onMore }, 'All ', icon('chevron')));
        }
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

        // Header
        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '14px' } });
        hdr.appendChild(el('h2', { style: { color: '#fff' } }, 'Shopping list'));
        const addBtn = el('button', { class: 'btn-add', onClick: () => { state.modal = 'addItem'; render(); } });
        addBtn.innerHTML = icons.plus;
        hdr.appendChild(addBtn);
        page.appendChild(hdr);

        // Category filter
        const pills = el('div', { class: 'pills' });
        const filterState = { current: 'all' };
        const allPill = el('button', { class: 'pill active', onClick: () => { filterState.current = 'all'; render(); } }, `All ${unchecked.length}`);
        pills.appendChild(allPill);
        CATEGORIES.filter(c => unchecked.some(i => i.category === c.id)).forEach(c => {
            pills.appendChild(el('button', { class: 'pill', onClick: () => { /* simplified: just show all */ } },
                `${c.icon} ${unchecked.filter(i => i.category === c.id).length}`));
        });
        page.appendChild(pills);

        // Empty
        if (unchecked.length === 0 && checked.length === 0) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.appendChild(el('div', { style: { fontSize: '28px' } }, '🛒'));
            card.appendChild(el('p', { class: 'text-sec', style: { marginTop: '10px' } }, 'List is empty'));
            card.appendChild(el('button', {
                class: 'btn-primary', style: { marginTop: '10px', fontSize: '13px' },
                onClick: () => { state.modal = 'addItem'; render(); }
            }, icon('plus'), ' Add item'));
            page.appendChild(card);
        }

        // Group by category
        const grouped = {};
        unchecked.forEach(i => { const c = i.category || 'sonstiges'; if (!grouped[c]) grouped[c] = []; grouped[c].push(i); });

        CATEGORIES.filter(c => grouped[c.id]).forEach(cat => {
            const catSec = el('div', { style: { marginBottom: '14px' } });
            const catHeader = el('div', { class: 'flex items-center', style: { gap: '5px', marginBottom: '5px' } });
            catHeader.appendChild(el('span', { style: { fontSize: '13px' } }, cat.icon));
            catHeader.appendChild(el('span', { style: { fontSize: '11px', fontWeight: '600', color: cat.color, textTransform: 'uppercase', letterSpacing: '0.5px' } }, cat.label));
            catSec.appendChild(catHeader);
            grouped[cat.id].forEach(item => catSec.appendChild(renderItemRow(item, cat)));
            page.appendChild(catSec);
        });

        // Checked
        if (checked.length > 0) {
            const sec = el('div', { style: { marginTop: '16px' } });
            const hdr2 = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '6px' } });
            hdr2.appendChild(el('span', { class: 'text-muted', style: { fontSize: '12px' } }, `✓ Done (${checked.length})`));
            hdr2.appendChild(el('button', {
                class: 'btn-link', style: { color: '#FF6B8A', fontSize: '11px' },
                onClick: async () => { state.items = state.items.filter(i => !i.checked); await saveAll(); toast(`${checked.length} removed`); render(); }
            }, icon('trash'), ' Clear'));
            sec.appendChild(hdr2);
            checked.forEach(item => {
                const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[8];
                const row = el('div', { class: 'row faded', onClick: async () => { item.checked = false; await saveAll(); render(); } });
                const chk = el('div', { class: 'check done' });
                chk.innerHTML = icons.check;
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

    function renderItemRow(item, cat, dashboardMode) {
        const row = el('div', { class: 'row' });
        const left = el('div', {
            class: 'flex items-center flex-1',
            style: { gap: '10px', cursor: 'pointer' },
            onClick: async () => {
                item.checked = !item.checked;
                item.checkedAt = item.checked ? new Date().toISOString() : null;
                await saveAll();
                render();
            }
        });
        const chk = el('div', { class: 'check', style: { borderColor: cat.color } });
        left.appendChild(chk);
        const content = el('div', { class: 'flex-1' });
        content.appendChild(el('span', { style: { fontSize: '14px', color: '#E4E7ED' } }, `${cat.icon} ${item.name}`));
        if (item.note) content.appendChild(el('p', { style: { fontSize: '11px', color: '#5C6478', marginTop: '1px' } }, item.note));
        left.appendChild(content);
        if (item.quantity > 1) left.appendChild(el('span', {
            style: { fontSize: '11px', color: '#5C6478', background: '#141820', padding: '1px 7px', borderRadius: '7px' }
        }, `×${item.quantity}`));
        row.appendChild(left);

        if (!dashboardMode) {
            const del = el('button', {
                class: 'btn-icon',
                onClick: async (e) => { e.stopPropagation(); state.items = state.items.filter(i => i.id !== item.id); await saveAll(); render(); }
            });
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
        hdr.appendChild(el('h2', { style: { color: '#fff' } }, 'Tasks'));
        const addBtn = el('button', { class: 'btn-add', onClick: () => { state.modal = 'addTask'; render(); } });
        addBtn.innerHTML = icons.plus;
        hdr.appendChild(addBtn);
        page.appendChild(hdr);

        if (open.length === 0 && done.length === 0) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.innerHTML = icons.sparkles;
            card.appendChild(el('p', { class: 'text-sec', style: { marginTop: '10px' } }, 'No tasks yet'));
            card.appendChild(el('button', {
                class: 'btn-primary', style: { marginTop: '10px', fontSize: '13px' },
                onClick: () => { state.modal = 'addTask'; render(); }
            }, icon('plus'), ' Create task'));
            page.appendChild(card);
        }

        if (open.length > 0) {
            const sec = renderSection('Open', open.length);
            open.forEach(t => sec.appendChild(renderTaskRow(t)));
            page.appendChild(sec);
        }

        if (done.length > 0) {
            const sec = renderSection('Completed', done.length);
            done.slice(0, 10).forEach(t => sec.appendChild(renderTaskRow(t, true)));
            page.appendChild(sec);
        }

        const fab = el('button', { class: 'fab', onClick: () => { state.modal = 'addTask'; render(); } });
        fab.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
        page.appendChild(fab);
        container.appendChild(page);
    }

    function renderTaskRow(task, isDone) {
        const freq = FREQUENCIES.find(f => f.id === task.frequency);
        const row = el('div', { class: `row${isDone ? ' faded' : ''}` });

        const left = el('div', {
            class: 'flex items-center flex-1',
            style: { gap: '10px', cursor: 'pointer' },
            onClick: async () => {
                task.status = task.status === 'open' ? 'done' : 'open';
                task.completedAt = task.status === 'done' ? new Date().toISOString() : null;
                task.completedBy = task.status === 'done' ? state.user.name : null;
                await saveAll();
                render();
            }
        });

        const chk = el('div', { class: `check${isDone ? ' done' : ''}`, style: { borderColor: isDone ? '#5AE4A8' : '#5AE4A8' } });
        if (isDone) chk.innerHTML = icons.check;
        left.appendChild(chk);

        const content = el('div', { class: 'flex-1' });
        content.appendChild(el('span', {
            style: { fontSize: '14px', color: isDone ? '#5C6478' : '#E4E7ED', textDecoration: isDone ? 'line-through' : 'none' }
        }, task.name));

        const meta = el('div', { class: 'flex items-center', style: { gap: '6px', marginTop: '2px' } });
        if (task.assignedTo) meta.appendChild(el('span', { style: { fontSize: '11px', color: '#8B93A7' } }, `→ ${task.assignedTo}`));
        if (task.frequency !== 'once') {
            const rep = el('span', { style: { fontSize: '10px', color: '#5AE4A8', display: 'flex', alignItems: 'center', gap: '2px' } });
            rep.innerHTML = icons.repeat;
            rep.appendChild(document.createTextNode(` ${freq?.short || ''}`));
            meta.appendChild(rep);
        }
        if (isDone && task.completedAt) meta.appendChild(el('span', { style: { fontSize: '10px', color: '#5C6478' } }, fmtDate(task.completedAt)));
        content.appendChild(meta);
        left.appendChild(content);
        row.appendChild(left);

        const del = el('button', {
            class: 'btn-icon',
            onClick: async (e) => { e.stopPropagation(); state.tasks = state.tasks.filter(t => t.id !== task.id); await saveAll(); render(); }
        });
        del.innerHTML = icons.trash;
        row.appendChild(del);
        return row;
    }

    // ========================================================================
    // HOUSEHOLD
    // ========================================================================
    function renderHousehold(container) {
        const page = el('div', { class: 'page' });
        page.appendChild(el('h2', { style: { color: '#fff', marginBottom: '14px' } }, 'Your Crib'));

        if (!state.household) {
            const card = el('div', { class: 'card text-center', style: { padding: '28px' } });
            card.appendChild(el('div', { style: { fontSize: '28px' } }, '🏠'));
            card.appendChild(el('p', { class: 'text-sec', style: { marginTop: '10px' } }, 'No crib created yet'));
            card.appendChild(renderInlineCreate());
            page.appendChild(card);
            container.appendChild(page);
            return;
        }

        // Household card
        const card = el('div', { class: 'card', style: { padding: '18px', position: 'relative', overflow: 'hidden' } });
        card.appendChild(el('div', { style: { position: 'absolute', top: '-20px', right: '-20px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(90,228,168,0.12)', filter: 'blur(20px)' } }));
        card.appendChild(el('h3', { style: { fontSize: '18px', color: '#fff' } }, state.household.name));
        card.appendChild(el('p', { style: { fontSize: '11px', color: '#5C6478', marginTop: '3px' } }, `Created ${fmtDate(state.household.createdAt)}`));

        const invite = el('div', { class: 'invite-box' });
        invite.appendChild(el('p', { style: { fontSize: '10px', color: '#5C6478', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' } }, 'Invite Code'));
        invite.appendChild(el('p', { class: 'invite-code' }, state.household.inviteCode));
        invite.appendChild(el('p', { style: { fontSize: '11px', color: '#5C6478', marginTop: '6px' } }, 'Share this code to invite roommates'));
        card.appendChild(invite);
        page.appendChild(card);

        // Members
        const sec = renderSection('Members', state.household.members.length);
        state.household.members.forEach(m => {
            const row = el('div', { class: 'row', style: { padding: '12px' } });
            row.appendChild(el('span', { style: { fontSize: '26px' } }, m.avatar));
            const info = el('div', { class: 'flex-1' });
            const nameRow = el('div', { class: 'flex items-center' });
            nameRow.appendChild(el('span', { style: { fontSize: '14px', fontWeight: '500', color: '#E4E7ED' } }, m.name));
            if (m.role === 'admin') nameRow.appendChild(el('span', {
                style: { fontSize: '9px', color: '#FFB347', marginLeft: '6px', background: 'rgba(255,179,71,0.1)', padding: '1px 6px', borderRadius: '6px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }
            }, 'admin'));
            info.appendChild(nameRow);
            row.appendChild(info);
            sec.appendChild(row);
        });
        page.appendChild(sec);

        // Export / Backup
        const backupSec = renderSection('Backup');
        const backupBtn = el('button', {
            class: 'btn-primary w-full',
            onClick: () => {
                const json = CasaStore.exportAll();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = el('a', { href: url, download: `casamorf-backup-${new Date().toISOString().slice(0, 10)}.json` });
                a.click();
                URL.revokeObjectURL(url);
                toast('Encrypted backup downloaded');
            }
        }, icon('download'), ' Export encrypted backup');
        backupSec.appendChild(backupBtn);
        backupSec.appendChild(el('p', { style: { fontSize: '11px', color: '#5C6478', textAlign: 'center', marginTop: '8px' } },
            '🔒 Backup is AES-256-GCM encrypted. Safe for public repos.'));
        page.appendChild(backupSec);

        container.appendChild(page);
    }

    function renderInlineCreate() {
        const wrap = el('div', { style: { marginTop: '16px' } });
        const input = el('input', { class: 'form-input', placeholder: 'e.g. CasaMorf 🏡', style: { textAlign: 'center' } });
        const btn = el('button', {
            class: 'btn-primary w-full', style: { marginTop: '8px' },
            onClick: async () => {
                const name = input.value.trim();
                if (!name) return;
                state.household = {
                    id: uid(), name,
                    members: [{ ...state.user, role: 'admin' }],
                    createdAt: new Date().toISOString(),
                    inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase()
                };
                await saveAll();
                toast(`"${name}" created!`);
                render();
            }
        }, icon('home'), ' Create crib');
        input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
        wrap.appendChild(input);
        wrap.appendChild(btn);
        return wrap;
    }

    // ========================================================================
    // ADD ITEM MODAL
    // ========================================================================
    function renderAddItemModal() {
        const overlay = el('div', { class: 'modal-overlay', onClick: () => { state.modal = null; render(); } });
        const sheet = el('div', { class: 'modal-sheet', onClick: e => e.stopPropagation() });
        sheet.appendChild(el('div', { class: 'modal-handle' }));

        const hdr = el('div', { class: 'flex items-center justify-between', style: { marginBottom: '16px' } });
        hdr.appendChild(el('h3', { style: { color: '#fff' } }, 'Add item'));
        const closeBtn = el('button', { class: 'btn-icon', onClick: () => { state.modal = null; render(); } });
        closeBtn.innerHTML = icons.x;
        hdr.appendChild(closeBtn);
        sheet.appendChild(hdr);

        let selectedCat = 'sonstiges';
        let qty = 1;

        sheet.appendChild(el('label', { class: 'form-label' }, 'Item'));
        const nameInput = el('input', { class: 'form-input', placeholder: 'e.g. Milch, Brot, Zahnpasta...' });
        sheet.appendChild(nameInput);

        sheet.appendChild(el('label', { class: 'form-label' }, 'Category'));
        const catGrid = el('div', { class: 'cat-grid' });
        CATEGORIES.forEach(c => {
            const btn = el('button', {
                class: 'cat-btn',
                style: c.id === selectedCat ? { borderColor: c.color, background: c.color + '18', color: c.color } : {},
                onClick: () => {
                    selectedCat = c.id;
                    catGrid.querySelectorAll('button').forEach(b => { b.style.borderColor = '#262D3D'; b.style.background = '#141820'; b.style.color = '#8B93A7'; });
                    btn.style.borderColor = c.color;
                    btn.style.background = c.color + '18';
                    btn.style.color = c.color;
                }
            }, `${c.icon} ${c.label}`);
            catGrid.appendChild(btn);
        });
        sheet.appendChild(catGrid);

        // Quantity + Note
        const row = el('div', { class: 'flex', style: { gap: '10px', marginBottom: '14px' } });
        const qtyWrap = el('div', { style: { flex: '1' } });
        qtyWrap.appendChild(el('label', { class: 'form-label' }, 'Qty'));
        const qtyRow = el('div', { class: 'flex items-center', style: { gap: '6px' } });
        const qtyDisplay = el('span', { style: { fontSize: '18px', fontWeight: '600', color: '#fff', width: '28px', textAlign: 'center' } }, '1');
        qtyRow.appendChild(el('button', { class: 'qty-btn', onClick: () => { qty = Math.max(1, qty - 1); qtyDisplay.textContent = qty; } }, '−'));
        qtyRow.appendChild(qtyDisplay);
        qtyRow.appendChild(el('button', { class: 'qty-btn', onClick: () => { qty++; qtyDisplay.textContent = qty; } }, '+'));
        qtyWrap.appendChild(qtyRow);
        row.appendChild(qtyWrap);

        const noteWrap = el('div', { style: { flex: '2' } });
        noteWrap.appendChild(el('label', { class: 'form-label' }, 'Note'));
        const noteInput = el('input', { class: 'form-input', placeholder: 'Bio, 500ml...' });
        noteWrap.appendChild(noteInput);
        row.appendChild(noteWrap);
        sheet.appendChild(row);

        const submitBtn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                state.items.unshift({
                    id: uid(), name, category: selectedCat, quantity: qty,
                    note: noteInput.value.trim(), checked: false,
                    addedAt: new Date().toISOString(), addedBy: state.user.name
                });
                await saveAll();
                state.modal = null;
                toast(`${name} added`);
                render();
            }
        }, icon('cart'), ' Add');

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
        hdr.appendChild(el('h3', { style: { color: '#fff' } }, 'New task'));
        const closeBtn = el('button', { class: 'btn-icon', onClick: () => { state.modal = null; render(); } });
        closeBtn.innerHTML = icons.x;
        hdr.appendChild(closeBtn);
        sheet.appendChild(hdr);

        let selectedFreq = 'once';
        let assignedTo = '';

        sheet.appendChild(el('label', { class: 'form-label' }, 'Task'));
        const nameInput = el('input', { class: 'form-input', placeholder: 'e.g. Küche putzen, Wäsche...' });
        sheet.appendChild(nameInput);

        sheet.appendChild(el('label', { class: 'form-label' }, 'Repeat'));
        const freqRow = el('div', { class: 'flex', style: { gap: '5px', flexWrap: 'wrap', marginBottom: '14px' } });
        FREQUENCIES.forEach(f => {
            const btn = el('button', {
                class: 'pill' + (f.id === selectedFreq ? ' active' : ''),
                onClick: () => {
                    selectedFreq = f.id;
                    freqRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
            if (f.id !== 'once') { btn.innerHTML = icons.repeat + ' '; }
            btn.appendChild(document.createTextNode(f.label));
            freqRow.appendChild(btn);
        });
        sheet.appendChild(freqRow);

        // Assign
        if (state.household?.members?.length > 0) {
            sheet.appendChild(el('label', { class: 'form-label' }, 'Assign to'));
            const assignRow = el('div', { class: 'flex', style: { gap: '5px', flexWrap: 'wrap', marginBottom: '14px' } });
            const nobodyBtn = el('button', { class: 'pill active', onClick: () => {
                assignedTo = '';
                assignRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                nobodyBtn.classList.add('active');
            } }, 'Nobody');
            assignRow.appendChild(nobodyBtn);
            state.household.members.forEach(m => {
                const btn = el('button', { class: 'pill', onClick: () => {
                    assignedTo = m.name;
                    assignRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                } }, `${m.avatar} ${m.name}`);
                assignRow.appendChild(btn);
            });
            sheet.appendChild(assignRow);
        }

        const submitBtn = el('button', {
            class: 'btn-primary w-full',
            onClick: async () => {
                const name = nameInput.value.trim();
                if (!name) return;
                state.tasks.unshift({
                    id: uid(), name, frequency: selectedFreq,
                    assignedTo: assignedTo || null, status: 'open',
                    createdAt: new Date().toISOString(), createdBy: state.user.name
                });
                await saveAll();
                state.modal = null;
                toast('Task created');
                render();
            }
        }, icon('check'), ' Create task');

        nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitBtn.click(); });
        sheet.appendChild(submitBtn);
        overlay.appendChild(sheet);
        setTimeout(() => nameInput.focus(), 150);
        return overlay;
    }

    // ========================================================================
    // INIT
    // ========================================================================
    function init() {
        render();
    }

    return { init };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
