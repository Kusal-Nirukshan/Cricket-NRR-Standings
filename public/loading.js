(function () {
    const DEFAULT_API_BASE_URL = 'https://nrr-calculator-7x00.onrender.com';
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
            <div class="app-loading-grid" aria-hidden="true"></div>
            <div class="app-loading-panel">
                <div class="app-loading-brand">
                    <img src="nrr-logo.png" alt="" class="app-loading-logo">
                    <span>NRR Calculator</span>
                </div>
                <div class="app-loading-terminal">
                    <h2 id="appLoadingTitle">Please wait, loading...</h2>
                    <p id="appLoadingMessage">Preparing your NRR calculator.</p>
                    <div class="app-loading-lines" aria-hidden="true">
                        <span>Checking server connection ...</span>
                        <span>Loading tournament tools ...</span>
                        <span>Preparing match data ...</span>
                    </div>
                    <div class="app-loading-progress">
                        <span></span>
                    </div>
                </div>
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
        const apiBaseUrl = window.APP_CONFIG?.apiBaseUrl || DEFAULT_API_BASE_URL;
        if (!apiBaseUrl || typeof resource !== 'string' || !resource.startsWith('/')) {
            return resource;
        }

        return apiBaseUrl.replace(/\/$/, '') + resource;
    }

    async function fetchWithLoading(resource, fetchOptions, loadingOptions) {
        return withLoading(() => fetch(apiUrl(resource), fetchOptions), loadingOptions);
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForBackend() {
        while (true) {
            try {
                const response = await fetch(apiUrl('/health'), { cache: 'no-store' });
                if (response.ok) return;
            } catch (err) {
                console.error('Backend wake check failed:', err);
            }

            await wait(2000);
        }
    }

    async function showUntilBackendWakes() {
        await withLoading(waitForBackend, {
            title: 'Please wait, loading...',
            message: 'The server is waking up. This can take a few seconds.',
            delay: 0
        });
    }

    async function readJson(response) {
        const text = await response.text();
        let data = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch (err) {
                const preview = text.replace(/\s+/g, ' ').slice(0, 140);
                throw new Error(`Expected JSON but received: ${preview}`);
            }
        }

        if (!response.ok) {
            throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
        }

        return data;
    }

    window.AppLoading = {
        show,
        hide,
        withLoading,
        apiUrl,
        fetch: fetchWithLoading,
        readJson,
        showUntilBackendWakes
    };

    document.addEventListener('DOMContentLoaded', showUntilBackendWakes);
})();
