/*
 * src/client/store.ts
 * ---------------------------------------------------------------------------
 * Boots the brand store. We delegate to initBrandsStore() from react-n8n-lib,
 * which:
 *
 *   1. Reads window.MYBRANDS (injected by HtmlWebpackPlugin at build time
 *      and/or overridden by the BFF /serveRoot at request time).
 *   2. Falls back to the project-local brand data bundled in projectBrands.
 *   3. Creates a redux store and (when configured) starts the GitHub poller.
 *
 * Returns the same `{ store, startPolling, stopPolling, getMeta }` shape so
 * App.tsx can subscribe through react-redux normally.
 * ---------------------------------------------------------------------------
 */

import { initBrandsStore } from 'react-n8n-lib';

import { projectBrands, DEFAULT_BRAND_NAME } from './projectBrands';

const PROJECT_ID = 'brand-app';

const ENVIRONMENT: 'local' | 'dev' | 'prod' =
    process.env.NODE_ENV === 'production' ? 'prod' : 'local';

const GITHUB_MANIFEST_URL =
    'https://raw.githubusercontent.com/your-org/your-brands-repo/main/brands/manifest.json';

const fallbackBrand = projectBrands[DEFAULT_BRAND_NAME];

export const brandStoreHandle = initBrandsStore({
    projectId: PROJECT_ID,
    brandName: DEFAULT_BRAND_NAME,
    environment: ENVIRONMENT,
    brandConfig: fallbackBrand.config,
    brandStrings: fallbackBrand.strings,
    brands: projectBrands,
    manifestUrl: GITHUB_MANIFEST_URL,
    intervalMs: 5 * 60 * 1000,
});

export const store = brandStoreHandle.store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
