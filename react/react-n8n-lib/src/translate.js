/*
 * translate.js
 * ---------------------------------------------------------------------------
 * Pure helpers used by the HOC to produce the `t` and `tt` props.
 *
 *   t(key, fallback?)            -> returns the raw translated string
 *                                   for `key`, or `fallback` (or `key` itself)
 *                                   if the key is missing.
 *
 *   tt(key, vars?, fallback?)    -> "templated t". Same as t() but also
 *                                   interpolates `{placeholder}` tokens
 *                                   using the `vars` object.
 *
 * Both helpers are intentionally synchronous and dependency-free.
 * ---------------------------------------------------------------------------
 */

/*
 * Replaces every {token} in `template` with vars[token].
 * If a token is missing from vars, it is left as-is so the developer can
 * spot the issue visually in the UI.
 */
function interpolate(template, vars) {
    if (!vars || typeof template !== 'string') {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, function (match, name) {
        return Object.prototype.hasOwnProperty.call(vars, name)
            ? String(vars[name])
            : match;
    });
}

// Resolve a dotted path like "calvinKlein.heading" against an object.
// Returns { found: boolean, value: any }.
function resolvePath(source, key) {
    if (!source || typeof key !== 'string' || key.length === 0) {
        return { found: false, value: undefined };
    }
    if (Object.prototype.hasOwnProperty.call(source, key)) {
        return { found: true, value: source[key] };
    }
    var parts = key.split('.');
    var cursor = source;
    for (var i = 0; i < parts.length; i++) {
        if (
            cursor != null &&
            typeof cursor === 'object' &&
            Object.prototype.hasOwnProperty.call(cursor, parts[i])
        ) {
            cursor = cursor[parts[i]];
        } else {
            return { found: false, value: undefined };
        }
    }
    return { found: true, value: cursor };
}

/*
 * Builds the `t` function bound to a specific translations dictionary.
 * Supports dotted keys (e.g. "calvinKlein.heading"). Returns the resolved
 * string, or the fallback (or the key) when the path is missing or the
 * resolved value is not a string.
 */
export function makeT(translations) {
    return function t(key, fallback) {
        var hit = resolvePath(translations, key);
        if (hit.found && typeof hit.value === 'string') {
            return hit.value;
        }
        return typeof fallback === 'string' ? fallback : key;
    };
}

/*
 * Builds the `tt` function bound to a specific translations dictionary.
 * Signature: tt(key, vars?, fallback?)
 */
export function makeTT(translations) {
    var t = makeT(translations);
    return function tt(key, vars, fallback) {
        return interpolate(t(key, fallback), vars);
    };
}

/*
 * Builds the `tExists` function. Returns true only when the dotted path
 * resolves to a defined, non-null value (string or otherwise).
 */
export function makeTExists(translations) {
    return function tExists(key) {
        var hit = resolvePath(translations, key);
        return hit.found && hit.value != null;
    };
}

export { interpolate, resolvePath };
