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

/*
 * Builds the `t` function bound to a specific translations dictionary.
 * Curried this way so the HOC can re-create it only when the dictionary
 * changes (cheap referential-stability optimisation for PureComponent /
 * React.memo consumers).
 */
export function makeT(translations) {
    return function t(key, fallback) {
        if (translations && Object.prototype.hasOwnProperty.call(translations, key)) {
            return translations[key];
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

export { interpolate };
