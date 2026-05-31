/*
 * n8nContext.js
 * ---------------------------------------------------------------------------
 * Creates the React Context used to share the translation state produced by
 * <N8nProvider /> with every component wrapped by the withN8nTranslation()
 * HOC further down the tree.
 *
 * The context value shape:
 *   {
 *     translations: { [key: string]: string },  // flat key -> string map
 *     locale:       string,                     // current locale, e.g. 'en'
 *     loading:      boolean,                    // true while fetching
 *     error:        Error | null,               // last fetch error, if any
 *     setLocale:    (locale: string) => void,   // change locale at runtime
 *     reload:       () => Promise<void>         // re-fetch translations
 *   }
 *
 * We deliberately keep this in its own file so consumer apps could (if they
 * really wanted to) `import { N8nContext } from 'react-n8n-lib'` and read it
 * with the static contextType pattern on their own class components.
 * ---------------------------------------------------------------------------
 */

import React from 'react';

/*
 * The default value is only used when a component reads the context without
 * a provider above it. We supply safe no-op defaults so consumers do not
 * crash; t() simply returns the key back, mimicking common i18n libs.
 */
const defaultContextValue = {
    translations: {},
    locale: 'en',
    loading: false,
    error: null,
    setLocale: () => { },
    reload: () => Promise.resolve(),
};

export const N8nContext = React.createContext(defaultContextValue);

// Friendlier name in React DevTools.
N8nContext.displayName = 'N8nContext';

export default N8nContext;
