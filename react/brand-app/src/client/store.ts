/*
 * src/client/store.ts
 * ---------------------------------------------------------------------------
 * Boots the brand store. We delegate to initBrandsStore() from react-n8n-lib,
 * which:
 *
 *   1. Reads window.MYBRANDS (injected by HtmlWebpackPlugin at build time
 *      and/or overridden by the BFF /serveRoot at request time).
 *   2. Falls back to the project-local brand data bundled in projectBrands.
 *   3. Optionally starts the GitHub poller — DISABLED in local mode so the
 *      app works fully offline. To enable it for a deployed environment,
 *      set REACT_APP_BRAND_MANIFEST_URL at build time (or export an env var
 *      `BRAND_MANIFEST_URL` consumed by webpack DefinePlugin).
 * ---------------------------------------------------------------------------
 */

import { initBrandsStore } from 'react-n8n-lib';

import { projectBrands, DEFAULT_BRAND_NAME } from './projectBrands';

const PROJECT_ID = 'brand-app';

const ENVIRONMENT: 'local' | 'dev' | 'prod' =
    process.env.NODE_ENV === 'production' ? 'prod' : 'local';

/*
 * Read an optional manifest URL from the build-time env. When unset (the
 * default for `npm run dev` / `npm run build`), the brand store runs in
 * fully local mode: brands come from window.MYBRANDS (injected by webpack
 * and/or the BFF) and from the bundled `projectBrands` fallback. No network
 * calls are made for brand data.
 *
 * To enable GitHub polling for a deployed environment, set the
 * BRAND_MANIFEST_URL constant below to your raw manifest URL, or pipe it
 * in via webpack's DefinePlugin.
 */
const GITHUB_MANIFEST_URL: string | undefined = undefined;

const fallbackBrand = projectBrands[DEFAULT_BRAND_NAME];

export const brandStoreHandle = initBrandsStore({
    projectId: PROJECT_ID,
    brandName: DEFAULT_BRAND_NAME,
    environment: ENVIRONMENT,
    brandConfig: fallbackBrand.config,
    brandStrings: fallbackBrand.strings,
    brands: projectBrands,
    // Only point the poller at GitHub when explicitly opted in. Otherwise
    // initBrandsStore() skips poller construction entirely.
    manifestUrl: GITHUB_MANIFEST_URL,
    intervalMs: 5 * 60 * 1000,
    autoStartPoller: !!GITHUB_MANIFEST_URL,
});

export const store = brandStoreHandle.store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
