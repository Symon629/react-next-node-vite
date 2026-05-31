/*
 * src/client/projectBrands.ts
 * ---------------------------------------------------------------------------
 * The project's own brand data, bundled with the client. Used as the build-
 * time fallback that gets injected into the HTML template when no BFF is in
 * front (e.g. local webpack-dev-server).
 *
 * In production, the BFF reads brands from disk and overrides this on the
 * window via /serveRoot \u2014 so this file is the "default offline" snapshot.
 * Keep it in sync with the JSON files under /brands.
 * ---------------------------------------------------------------------------
 */

import tommyHilfigerStrings from '../../brands/tommyHilfiger/strings.json';
import tommyHilfigerConfig from '../../brands/tommyHilfiger/config.json';
import calvinKleinStrings from '../../brands/calvinKlein/strings.json';
import calvinKleinConfig from '../../brands/calvinKlein/config.json';

import type { BrandConfig, BrandStrings } from '../shared/types';

export const projectBrands: Record<string, { strings: BrandStrings; config: BrandConfig }> = {
    tommyHilfiger: { strings: tommyHilfigerStrings, config: tommyHilfigerConfig as BrandConfig },
    calvinKlein: { strings: calvinKleinStrings, config: calvinKleinConfig as BrandConfig },
};

export const DEFAULT_BRAND_NAME = 'tommyHilfiger';
