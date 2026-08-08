(function () {
    const state = {
        activeCount: 0,
        shownAt: 0,
        showTimer: null,
        hideTimer: null
    };

    function ensureOverlay() {
        let overlay = document.getElementById('appLoadingOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'appLoadingOverlay';
        overlay.className = 'app-loading-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.innerHTML = `
            <div class="app-loading-panel">
                <img src="nrr-logo.png" alt="" class="app-loading-logo">
                <div class="app-loading-spinner" aria-hidden="true"></div>
                <h2 id="appLoadingTitle">Starting server...</h2>
                <p id="appLoadingMessage">The free Render server may need a few seconds to wake up.</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    function setText(title, message) {
        const overlay = ensureOverlay();
        overlay.querySelector('#appLoadingTitle').textContent = title || 'Loading...';
        overlay.querySelector('#appLoadingMessage').textContent = message || 'Please wait.';
    }

    function show(options = {}) {
        state.activeCount += 1;
        clearTimeout(state.hideTimer);
        setText(options.title, options.message);

        const delay = typeof options.delay === 'number' ? options.delay : 350;
        clearTimeout(state.showTimer);
        state.showTimer = setTimeout(() => {
            const overlay = ensureOverlay();
            state.shownAt = Date.now();
            overlay.classList.add('is-visible');
            document.body.classList.add('app-loading-active');
        }, delay);
    }

    function hide() {
        state.activeCount = Math.max(0, state.activeCount - 1);
        if (state.activeCount > 0) return;

        clearTimeout(state.showTimer);
        const overlay = document.getElementById('appLoadingOverlay');
        if (!overlay) return;

        const visibleFor = Date.now() - state.shownAt;
        const wait = state.shownAt ? Math.max(0, 350 - visibleFor) : 0;

        state.hideTimer = setTimeout(() => {
            overlay.classList.remove('is-visible');
            document.body.classList.remove('app-loading-active');
            state.shownAt = 0;
        }, wait);
    }

    async function withLoading(work, options = {}) {
        show(options);
        try {
            return await work();
        } finally {
            hide();
        }
    }

    function apiUrl(resource) {
        const apiBaseUrl = window.APP_CONFIG?.apiBaseUrl || '';
        if (!apiBaseUrl || typeof resource !== 'string' || !resource.startsWith('/')) {
            return resource;
        }

        return apiBaseUrl.replace(/\/$/, '') + resource;
    }

    async function fetchWithLoading(resource, fetchOptions, loadingOptions) {
        return withLoading(() => fetch(apiUrl(resource), fetchOptions), loadingOptions);
    }

    window.AppLoading = {
        show,
        hide,
        withLoading,
        apiUrl,
        fetch: fetchWithLoading
    };
})();
