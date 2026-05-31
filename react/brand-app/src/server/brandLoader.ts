/*
 * src/server/brandLoader.ts
 * ---------------------------------------------------------------------------
 * Reads the project-local brands folder from disk at boot (or on every
 * request, depending on NODE_ENV) and returns a BrandsPayload ready to be
 * injected into the served HTML as window.MYBRANDS.
 *
 * The local folder mirrors the layout shipped by react-n8n-lib so the same
 * shape is used everywhere:
 *
 *   brands/
 *     manifest.json           // { activeBrandId, brandIds: [...] }
 *     <brandId>/strings.json
 *     <brandId>/config.json
 * ---------------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import type { BrandConfig, BrandEntry, BrandsPayload, BrandStrings } from '../shared/types';

const BRANDS_DIR = path.resolve(__dirname, '../../brands');
const PROJECT_ID = 'brand-app';

interface Manifest {
    activeBrandId: string;
    brandIds: string[];
}

function readJson<T>(filePath: string): T {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
}

function safeReadJson<T>(filePath: string, fallback: T): T {
    try { return readJson<T>(filePath); } catch { return fallback; }
}

function resolveEnv(): 'local' | 'dev' | 'prod' {
    const e = process.env.APP_ENV || process.env.NODE_ENV;
    if (e === 'production' || e === 'prod') return 'prod';
    if (e === 'development' || e === 'dev') return 'dev';
    return 'local';
}

/*
 * Loads the full brands payload synchronously. Synchronous IO is fine here
 * because this runs at boot (cached in module scope) and per-request only
 * in development. For production we re-use the cached snapshot.
 */
export function loadBrands(): BrandsPayload {
    const manifestPath = path.join(BRANDS_DIR, 'manifest.json');
    const manifest = readJson<Manifest>(manifestPath);

    const brands: Record<string, BrandEntry> = {};
    for (const brandId of manifest.brandIds) {
        const dir = path.join(BRANDS_DIR, brandId);
        brands[brandId] = {
            strings: safeReadJson<BrandStrings>(path.join(dir, 'strings.json'), {}),
            // Cast to BrandConfig — we trust local source-controlled JSON.
            config: safeReadJson<BrandConfig>(path.join(dir, 'config.json'), {} as BrandConfig),
        };
    }

    const active = manifest.activeBrandId;
    const activeEntry = brands[active] || { strings: {}, config: {} as BrandConfig };

    return {
        projectId: PROJECT_ID,
        brandName: active,
        environment: resolveEnv(),
        brandConfig: activeEntry.config,
        brandStrings: activeEntry.strings,
        brands,
        activeBrandId: active,
    };
}

let cached: BrandsPayload | null = null;

export function getBrandsPayload(): BrandsPayload {
    // In development, reload on every request so editing JSON files is hot.
    if (process.env.NODE_ENV !== 'production') {
        return loadBrands();
    }
    if (!cached) cached = loadBrands();
    return cached;
}
