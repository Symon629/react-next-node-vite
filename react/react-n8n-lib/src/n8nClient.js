/*
 * n8nClient.js
 * ---------------------------------------------------------------------------
 * Tiny helper around `fetch` that talks to an n8n Webhook node.
 *
 * The expected n8n workflow:
 *   1. Webhook (GET) trigger at e.g. https://your-n8n.example.com/webhook/i18n
 *   2. Function / Set node that returns a JSON object shaped like:
 *        {
 *          "locale": "en",
 *          "translations": {
 *            "hello":       "Hello",
 *            "greet.user":  "Hello, {name}!",
 *            "items.count": "You have {count} items"
 *          }
 *        }
 *   3. Respond to Webhook node.
 *
 * The locale is forwarded as a query string parameter (?locale=xx) so a single
 * n8n workflow can branch on it via the Switch node.
 * ---------------------------------------------------------------------------
 */

/*
 * fetchTranslations
 *  - webhookUrl: full URL of the n8n webhook
 *  - locale:     locale code, appended as ?locale=<code>
 *  - options:    { headers?, signal? } passed straight through to fetch
 *
 * Returns: Promise<{ locale: string, translations: object }>
 */
export function fetchTranslations(webhookUrl, locale, options) {
    if (!webhookUrl) {
        return Promise.reject(new Error('[react-n8n-lib] webhookUrl is required'));
    }

    // Build the final URL with locale query param without clobbering existing ones.
    var url;
    try {
        url = new URL(webhookUrl);
        if (locale) {
            url.searchParams.set('locale', locale);
        }
    } catch (e) {
        // Fall back to naive concatenation if URL is not absolute (e.g. dev proxy).
        var sep = webhookUrl.indexOf('?') === -1 ? '?' : '&';
        url = webhookUrl + (locale ? sep + 'locale=' + encodeURIComponent(locale) : '');
    }

    var opts = options || {};

    return fetch(url.toString ? url.toString() : url, {
        method: 'GET',
        headers: Object.assign(
            { 'Accept': 'application/json' },
            opts.headers || {}
        ),
        signal: opts.signal,
    }).then(function (res) {
        if (!res.ok) {
            throw new Error(
                '[react-n8n-lib] n8n webhook responded ' + res.status + ' ' + res.statusText
            );
        }
        return res.json();
    }).then(function (payload) {
        /*
         * Be lenient about the shape n8n returns. n8n sometimes wraps the
         * Respond-to-Webhook body inside an array of one item, depending on
         * how the workflow is configured.
         */
        var data = Array.isArray(payload) ? payload[0] : payload;
        var translations = (data && data.translations) || {};
        var resolvedLocale = (data && data.locale) || locale || 'en';
        return { locale: resolvedLocale, translations: translations };
    });
}

export default fetchTranslations;
