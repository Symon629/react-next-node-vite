/*
 * brandPoller.js
 * ---------------------------------------------------------------------------
 * Polls a GitHub-hosted brands manifest at a configurable cadence and pushes
 * the result into the brandStore via the supplied dispatch.
 *
 * Recommended layout (raw URLs):
 *
 *   https://raw.githubusercontent.com/<org>/<repo>/<branch>/brands/manifest.json
 *
 *   manifest.json:
 *     {
 *       "tommyHilfiger": {
 *         "strings": "tommyHilfiger/strings.json",
 *         "config":  "tommyHilfiger/config.json"
 *       },
 *       ...
 *     }
 *
 * The poller fetches the manifest, then every referenced file, and dispatches
 * REPLACE_ALL with the merged brands map. ETag is honoured so we don't
 * re-dispatch when nothing changed remotely.
 *
 * Security:
 *   - GET only.
 *   - Non-object / non-JSON manifests are rejected.
 *   - Per-brand entries with malformed shapes are dropped silently so a
 *     single bad brand cannot poison the whole registry.
 * ---------------------------------------------------------------------------
 */

import { brandActions } from './brandStore';

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function joinUrl(base, rel) {
    if (/^https?:\/\//i.test(rel)) return rel;
    if (base.endsWith('/')) return base + rel;
    var i = base.lastIndexOf('/');
    return (i >= 0 ? base.slice(0, i + 1) : base + '/') + rel;
}

export function createBrandPoller(options) {
    var opts = options || {};
    var manifestUrl = opts.manifestUrl;
    var dispatch = opts.dispatch;
    var intervalMs = opts.intervalMs || 5 * 60 * 1000; // 5 min default
    var headers = opts.headers || {};
    var fetchImpl = opts.fetch || (typeof fetch !== 'undefined' ? fetch : null);

    if (!manifestUrl) throw new Error('[react-n8n-lib] brandPoller: manifestUrl is required');
    if (!dispatch) throw new Error('[react-n8n-lib] brandPoller: dispatch is required');
    if (!fetchImpl) throw new Error('[react-n8n-lib] brandPoller: fetch is not available');

    var timer = null;
    var aborter = null;
    var lastEtag = null;

    function fetchJson(url, signal) {
        var h = Object.assign({ 'Accept': 'application/json' }, headers);
        return fetchImpl(url, { headers: h, signal: signal, cache: 'no-store' }).then(function (res) {
            if (res.status === 304) return null;
            if (!res.ok) throw new Error('GET ' + url + ' -> ' + res.status);
            return res.json();
        });
    }

    function pollOnce() {
        if (aborter) aborter.abort();
        aborter = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var signal = aborter ? aborter.signal : undefined;

        dispatch(brandActions.pollStart());

        var conditional = Object.assign({ 'Accept': 'application/json' }, headers);
        if (lastEtag) conditional['If-None-Match'] = lastEtag;

        return fetchImpl(manifestUrl, { headers: conditional, signal: signal, cache: 'no-store' })
            .then(function (res) {
                if (res.status === 304) return null;
                if (!res.ok) throw new Error('GET manifest -> ' + res.status);
                if (res.headers && res.headers.get) lastEtag = res.headers.get('etag');
                return res.json();
            })
            .then(function (manifest) {
                if (!manifest) return;                       // 304 — nothing changed
                if (!isPlainObject(manifest)) throw new Error('manifest is not an object');

                var brandIds = Object.keys(manifest);
                return Promise.all(brandIds.map(function (id) {
                    var entry = manifest[id];
                    if (!isPlainObject(entry)) return [id, null];
                    return Promise.all([
                        entry.strings ? fetchJson(joinUrl(manifestUrl, entry.strings), signal) : Promise.resolve({}),
                        entry.config ? fetchJson(joinUrl(manifestUrl, entry.config), signal) : Promise.resolve({}),
                    ]).then(function (pair) {
                        return [id, {
                            strings: isPlainObject(pair[0]) ? pair[0] : {},
                            config: isPlainObject(pair[1]) ? pair[1] : {},
                        }];
                    });
                })).then(function (entries) {
                    var brands = {};
                    entries.forEach(function (e) { if (e[1]) brands[e[0]] = e[1]; });
                    dispatch(brandActions.replaceAll(brands));
                });
            })
            .catch(function (err) {
                if (err && err.name === 'AbortError') return;
                dispatch(brandActions.pollError(err));
            });
    }

    return {
        start: function () {
            if (timer) return;
            pollOnce();
            timer = setInterval(pollOnce, intervalMs);
        },
        stop: function () {
            if (timer) { clearInterval(timer); timer = null; }
            if (aborter) { aborter.abort(); aborter = null; }
        },
        pollNow: pollOnce,
    };
}

export default createBrandPoller;
