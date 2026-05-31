/*
 * brandStore.js
 * ---------------------------------------------------------------------------
 * Redux reducer + selectors + action creators + factory for brand data.
 *
 * Public API used by consumer apps:
 *
 *   createBrandStore({
 *     projectId,         // unique app identifier (string)
 *     brandName,         // active brand id (e.g. 'tommyHilfiger')
 *     environment,       // 'local' | 'dev' | 'prod'
 *     brandConfig,       // the project's own per-brand config
 *     brandStrings,      // the project's own per-brand strings
 *     manifestUrl?,      // optional GitHub manifest URL for live polling
 *     intervalMs?,       // poll cadence (default 5 min)
 *     autoStartPoller?,  // default: true if manifestUrl present
 *   }) -> { store, startPolling, stopPolling, getMeta }
 *
 *   initBrandsStore(overrides?) -> same
 *     Reads window.MYBRANDS produced by the BFF / HTML webpack plugin and
 *     hands it straight into createBrandStore. Anything in `overrides`
 *     wins over the injected payload (useful for tests / SSR).
 *
 * Lower-level pieces (brandReducer, brandActions, selectors, BRAND_ACTIONS)
 * are still exported for apps that already own a redux store and just want
 * to plug the slice in via combineReducers().
 *
 * State shape:
 *   {
 *     meta: { projectId, brandName, environment },
 *     activeBrandId: string | null,
 *     brands:        { [brandId]: { strings, config } },
 *     status:        'idle' | 'polling' | 'error',
 *     lastUpdatedAt: number | null,
 *     error:         Error | null
 *   }
 * ---------------------------------------------------------------------------
 */

import staticBrands from './brands';
import { createBrandPoller } from './brandPoller';

export const BRAND_ACTIONS = {
    HYDRATE: '@@brand/HYDRATE',       // initial sync from window.MYBRANDS
    SET_ACTIVE: '@@brand/SET_ACTIVE',
    SET_META: '@@brand/SET_META',      // projectId / brandName / env
    UPDATE_BRAND: '@@brand/UPDATE_BRAND',   // single brand patch
    REPLACE_ALL: '@@brand/REPLACE_ALL',    // full poll result
    POLL_START: '@@brand/POLL_START',
    POLL_ERROR: '@@brand/POLL_ERROR',
};

/*
 * The window.MYBRANDS payload shape we expect from the BFF / HTML webpack
 * plugin. Either the legacy multi-brand `brands` map, or the new
 * single-active-brand layout the consumer ships:
 *
 *   {
 *     projectId, brandName, environment,
 *     brandConfig:  {...}, brandStrings: {...}
 *   }
 *
 * Both are accepted by readWindowBrands() and normalised into the same
 * internal shape.
 */

/*
 * Read the BFF-injected snapshot from window.MYBRANDS. Defensive on purpose:
 * anything injected has crossed a trust boundary, so malformed data is
 * treated as "no snapshot" and the caller falls back to defaults.
 *
 * Returns the normalised shape:
 *   {
 *     meta:   { projectId, brandName, environment },
 *     brands: { [brandId]: { strings, config } },
 *     activeBrandId: string
 *   }
 * or null if nothing usable is on the window.
 */
export function readWindowBrands() {
    if (typeof window === 'undefined') return null;
    var raw = window.MYBRANDS;
    if (!raw || typeof raw !== 'object') return null;

    var meta = {
        projectId: typeof raw.projectId === 'string' ? raw.projectId : null,
        brandName: typeof raw.brandName === 'string' ? raw.brandName : null,
        environment: typeof raw.environment === 'string' ? raw.environment : null,
    };

    // New shape: a single active brand with its own strings/config.
    if (raw.brandStrings || raw.brandConfig) {
        if (!meta.brandName) return null;
        var brands = {};
        brands[meta.brandName] = {
            strings: (raw.brandStrings && typeof raw.brandStrings === 'object') ? raw.brandStrings : {},
            config: (raw.brandConfig && typeof raw.brandConfig === 'object') ? raw.brandConfig : {},
        };
        return { meta: meta, brands: brands, activeBrandId: meta.brandName };
    }

    // Legacy shape: multi-brand registry.
    if (raw.brands && typeof raw.brands === 'object') {
        return {
            meta: meta,
            brands: raw.brands,
            activeBrandId: typeof raw.activeBrandId === 'string'
                ? raw.activeBrandId
                : (meta.brandName || null),
        };
    }

    return null;
}

/*
 * Build the initial reducer state. Consumers can pass:
 *   - projectId / brandName / environment
 *   - brandConfig + brandStrings  (their own data, single active brand)
 *   - brands                       (a multi-brand map; takes precedence)
 *
 * Anything missing falls back to the window-injected payload, then to the
 * static registry shipped with the library.
 */
export function getInitialBrandState(overrides) {
    var o = overrides || {};
    var injected = readWindowBrands();

    // Resolve meta — explicit overrides win, then window, then null.
    var meta = {
        projectId: o.projectId || (injected && injected.meta.projectId) || null,
        brandName: o.brandName || (injected && injected.meta.brandName) || null,
        environment: o.environment || (injected && injected.meta.environment) || null,
    };

    // Resolve brand registry.
    var brands = Object.assign({}, staticBrands);
    if (injected && injected.brands) {
        brands = Object.assign(brands, injected.brands);
    }
    if (o.brands && typeof o.brands === 'object') {
        brands = Object.assign(brands, o.brands);
    }
    if (o.brandConfig || o.brandStrings) {
        var id = meta.brandName;
        if (id) {
            brands[id] = {
                strings: o.brandStrings || (brands[id] && brands[id].strings) || {},
                config: o.brandConfig || (brands[id] && brands[id].config) || {},
            };
        }
    }

    var activeBrandId =
        meta.brandName ||
        (injected && injected.activeBrandId) ||
        Object.keys(brands)[0] ||
        null;

    return {
        meta: meta,
        activeBrandId: activeBrandId,
        brands: brands,
        status: 'idle',
        lastUpdatedAt: injected ? Date.now() : null,
        error: null,
    };
}

export function brandReducer(state, action) {
    if (state === undefined) state = getInitialBrandState();
    if (!action || !action.type) return state;

    switch (action.type) {
        case BRAND_ACTIONS.HYDRATE: {
            var p = action.payload || {};
            return Object.assign({}, state, {
                brands: Object.assign({}, state.brands, p.brands || {}),
                activeBrandId: p.activeBrandId || state.activeBrandId,
                lastUpdatedAt: Date.now(),
            });
        }

        case BRAND_ACTIONS.SET_ACTIVE:
            if (!action.payload || !state.brands[action.payload]) return state;
            return Object.assign({}, state, {
                activeBrandId: action.payload,
                meta: Object.assign({}, state.meta, { brandName: action.payload }),
            });

        case BRAND_ACTIONS.SET_META:
            return Object.assign({}, state, {
                meta: Object.assign({}, state.meta, action.payload || {}),
            });

        case BRAND_ACTIONS.UPDATE_BRAND: {
            var brandId = action.payload && action.payload.brandId;
            if (!brandId) return state;
            var nextBrands = Object.assign({}, state.brands);
            nextBrands[brandId] = Object.assign(
                {},
                state.brands[brandId] || {},
                action.payload.data || {}
            );
            return Object.assign({}, state, {
                brands: nextBrands,
                lastUpdatedAt: Date.now(),
            });
        }

        case BRAND_ACTIONS.REPLACE_ALL:
            return Object.assign({}, state, {
                brands: action.payload || {},
                status: 'idle',
                lastUpdatedAt: Date.now(),
                error: null,
            });

        case BRAND_ACTIONS.POLL_START:
            return Object.assign({}, state, { status: 'polling', error: null });

        case BRAND_ACTIONS.POLL_ERROR:
            return Object.assign({}, state, { status: 'error', error: action.payload });

        default:
            return state;
    }
}

/* ---- selectors ---------------------------------------------------------- */

export function selectActiveBrand(state) {
    if (!state || !state.activeBrandId) return null;
    return state.brands[state.activeBrandId] || null;
}
export function selectActiveStrings(state) { var b = selectActiveBrand(state); return (b && b.strings) || {}; }
export function selectActiveConfig(state) { var b = selectActiveBrand(state); return (b && b.config) || {}; }
export function selectBrandMeta(state) { return (state && state.meta) || { projectId: null, brandName: null, environment: null }; }

/* ---- action creators ---------------------------------------------------- */

export const brandActions = {
    hydrate: function (payload) { return { type: BRAND_ACTIONS.HYDRATE, payload: payload }; },
    setActive: function (id) { return { type: BRAND_ACTIONS.SET_ACTIVE, payload: id }; },
    setMeta: function (meta) { return { type: BRAND_ACTIONS.SET_META, payload: meta }; },
    updateBrand: function (brandId, data) { return { type: BRAND_ACTIONS.UPDATE_BRAND, payload: { brandId: brandId, data: data } }; },
    replaceAll: function (brands) { return { type: BRAND_ACTIONS.REPLACE_ALL, payload: brands }; },
    pollStart: function () { return { type: BRAND_ACTIONS.POLL_START }; },
    pollError: function (err) { return { type: BRAND_ACTIONS.POLL_ERROR, payload: err }; },
};

/*
 * createBrandStore(options) -> { store, startPolling, stopPolling, getMeta }
 *
 * Builds a self-contained brand redux store seeded with everything the
 * consumer app supplies (projectId, brandName, environment + its own
 * brandConfig and brandStrings). When a manifestUrl is given, the GitHub
 * poller is wired up automatically and (by default) started.
 *
 * Apps that already own a redux store should skip this factory and feed
 * `brandReducer` into their own combineReducers() instead.
 *
 * options:
 *   projectId         string  required
 *   brandName         string  required
 *   environment       'local' | 'dev' | 'prod'  required
 *   brandConfig       object  the project's own active-brand config
 *   brandStrings      object  the project's own active-brand i18n strings
 *   brands            object  optional multi-brand map for runtime switching
 *   manifestUrl       string  optional GitHub raw manifest URL
 *   intervalMs        number  poll cadence, default 5 min
 *   autoStartPoller   boolean default: !!manifestUrl
 *   headers           object  optional fetch headers (e.g. via a proxy)
 */
export function createBrandStore(options) {
    var opts = options || {};

    if (!opts.projectId) throw new Error('[react-n8n-lib] createBrandStore: projectId is required');
    if (!opts.brandName) throw new Error('[react-n8n-lib] createBrandStore: brandName is required');
    if (!opts.environment) throw new Error('[react-n8n-lib] createBrandStore: environment is required');

    var preloaded = getInitialBrandState({
        projectId: opts.projectId,
        brandName: opts.brandName,
        environment: opts.environment,
        brandConfig: opts.brandConfig,
        brandStrings: opts.brandStrings,
        brands: opts.brands,
    });

    var state = brandReducer(preloaded, { type: '@@INIT' });
    var listeners = [];

    function dispatch(action) {
        state = brandReducer(state, action);
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](); } catch (_e) { /* listener errors must not break dispatch */ }
        }
        return action;
    }
    function subscribe(listener) {
        listeners.push(listener);
        return function () {
            var i = listeners.indexOf(listener);
            if (i !== -1) listeners.splice(i, 1);
        };
    }

    var store = {
        getState: function () { return state; },
        dispatch: dispatch,
        subscribe: subscribe,
    };

    /* ---- optional GitHub polling --------------------------------------- */

    var poller = null;
    if (opts.manifestUrl) {
        poller = createBrandPoller({
            manifestUrl: opts.manifestUrl,
            dispatch: dispatch,
            intervalMs: opts.intervalMs,
            headers: opts.headers,
        });
        var autoStart = (opts.autoStartPoller !== false);
        if (autoStart) poller.start();
    }

    return {
        store: store,
        startPolling: function () { if (poller) poller.start(); },
        stopPolling: function () { if (poller) poller.stop(); },
        pollNow: function () { return poller ? poller.pollNow() : Promise.resolve(); },
        getMeta: function () { return state.meta; },
    };
}

/*
 * initBrandsStore(overrides?) -> same shape as createBrandStore()
 *
 * The recommended bootstrap call from the React entry point. Reads the
 * BFF/HTML-webpack-plugin-injected window.MYBRANDS payload, then defers to
 * createBrandStore so all the same options (manifestUrl, intervalMs, etc.)
 * are still available via `overrides`. Anything in `overrides` wins.
 *
 * Throws if neither window.MYBRANDS nor `overrides` supplies the required
 * meta fields, so a misconfigured deployment fails loudly at boot rather
 * than rendering a blank UI.
 */
export function initBrandsStore(overrides) {
    var o = overrides || {};
    var injected = readWindowBrands();

    var merged = {
        projectId: o.projectId || (injected && injected.meta.projectId),
        brandName: o.brandName || (injected && injected.meta.brandName),
        environment: o.environment || (injected && injected.meta.environment),
        brandConfig: o.brandConfig || (injected && injected.brands && injected.activeBrandId
            ? (injected.brands[injected.activeBrandId] || {}).config
            : undefined),
        brandStrings: o.brandStrings || (injected && injected.brands && injected.activeBrandId
            ? (injected.brands[injected.activeBrandId] || {}).strings
            : undefined),
        brands: o.brands || (injected && injected.brands),
        manifestUrl: o.manifestUrl,
        intervalMs: o.intervalMs,
        autoStartPoller: o.autoStartPoller,
        headers: o.headers,
    };

    return createBrandStore(merged);
}

export default brandReducer;
