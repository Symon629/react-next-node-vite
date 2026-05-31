/*
 * Ambient type declarations for react-n8n-lib (the lib is shipped as Babel-
 * compiled JS, no types). Keep these aligned with the public exports listed
 * in react-n8n-lib/src/index.js.
 */

declare module 'react-n8n-lib' {
    import * as React from 'react';

    /* ---- shared shapes ------------------------------------------------- */

    export interface BrandStrings { [key: string]: string; }
    // BrandConfigShape is intentionally loose: the lib stores whatever
    // the consumer passes, so we let the consumer's own narrow type
    // (e.g. BrandConfig) flow through without structural friction.
    export type BrandConfigShape = Record<string, any>;
    export interface BrandEntry { strings: BrandStrings; config: BrandConfigShape; }

    export interface BrandMeta {
        projectId: string | null;
        brandName: string | null;
        environment: 'local' | 'dev' | 'prod' | null;
    }

    export interface BrandState {
        meta: BrandMeta;
        activeBrandId: string | null;
        brands: Record<string, BrandEntry>;
        status: 'idle' | 'polling' | 'error';
        lastUpdatedAt: number | null;
        error: Error | null;
    }

    /* ---- n8n translation HOC ------------------------------------------- */

    export const N8nProvider: React.ComponentType<{
        webhookUrl: string;
        locale?: string;
        headers?: Record<string, string>;
        initialTranslations?: Record<string, string>;
        children?: React.ReactNode;
    }>;
    export const N8nContext: React.Context<unknown>;
    export function withN8nTranslation(options?: {
        propName?: string;
        templatedPropName?: string;
        existsPropName?: string;
    }): <P>(c: React.ComponentType<P>) => React.ComponentType<P>;
    export function fetchTranslations(
        webhookUrl: string,
        locale?: string,
        options?: { headers?: Record<string, string>; signal?: AbortSignal }
    ): Promise<{ locale: string; translations: Record<string, string> }>;
    export function makeT(translations: unknown): (key: string, fallback?: string) => string;
    export function makeTT(translations: unknown): (key: string, vars?: Record<string, unknown>, fallback?: string) => string;
    export function makeTExists(translations: unknown): (key: string) => boolean;
    export function interpolate(template: string, vars?: Record<string, unknown>): string;

    /* ---- brand subsystem ----------------------------------------------- */

    export interface CreateBrandStoreOptions {
        projectId: string;
        brandName: string;
        environment: 'local' | 'dev' | 'prod';
        brandConfig: BrandConfigShape;
        brandStrings: BrandStrings;
        brands?: Record<string, BrandEntry>;
        manifestUrl?: string;
        intervalMs?: number;
        autoStartPoller?: boolean;
        headers?: Record<string, string>;
    }

    export interface BrandStoreLike {
        getState(): BrandState;
        dispatch<A extends { type: string; payload?: unknown }>(action: A): A;
        subscribe(listener: () => void): () => void;
    }

    export interface BrandStoreHandle {
        store: BrandStoreLike;
        startPolling(): void;
        stopPolling(): void;
        pollNow(): Promise<void>;
        getMeta(): BrandMeta;
    }

    export function createBrandStore(options: CreateBrandStoreOptions): BrandStoreHandle;
    export function initBrandsStore(overrides?: Partial<CreateBrandStoreOptions>): BrandStoreHandle;

    export const BRAND_ACTIONS: Record<string, string>;
    export const brandActions: {
        hydrate(payload: { brands?: Record<string, BrandEntry>; activeBrandId?: string; meta?: Partial<BrandMeta> }): { type: string; payload: unknown };
        setActive(id: string): { type: string; payload: string };
        setMeta(meta: Partial<BrandMeta>): { type: string; payload: Partial<BrandMeta> };
        updateBrand(brandId: string, data: Partial<BrandEntry>): { type: string; payload: unknown };
        replaceAll(brands: Record<string, BrandEntry>): { type: string; payload: unknown };
        pollStart(): { type: string };
        pollError(err: Error): { type: string; payload: Error };
    };

    export function brandReducer(state: BrandState | undefined, action: { type: string; payload?: unknown }): BrandState;
    export function getInitialBrandState(overrides?: Partial<CreateBrandStoreOptions>): BrandState;
    export function readWindowBrands(): {
        meta: BrandMeta;
        brands: Record<string, BrandEntry>;
        activeBrandId: string | null;
    } | null;

    export function selectActiveBrand(state: BrandState): BrandEntry | null;
    export function selectActiveStrings(state: BrandState): BrandStrings;
    export function selectActiveConfig(state: BrandState): BrandConfigShape;
    export function selectBrandMeta(state: BrandState): BrandMeta;

    export function createBrandPoller(options: {
        manifestUrl: string;
        dispatch: (action: { type: string; payload?: unknown }) => void;
        intervalMs?: number;
        headers?: Record<string, string>;
        fetch?: typeof fetch;
    }): { start(): void; stop(): void; pollNow(): Promise<void> };

    export const BrandProvider: React.ComponentType<{
        dispatch: (action: { type: string; payload?: unknown }) => void;
        manifestUrl?: string;
        intervalMs?: number;
        headers?: Record<string, string>;
        children?: React.ReactNode;
    }>;
    export const BrandContext: React.Context<unknown>;
    export function withBrand(options?: {
        slice?: (rootState: unknown) => BrandState;
        propName?: string;
    }): <P>(c: React.ComponentType<P>) => React.ComponentType<P>;

    export const staticBrands: Record<string, BrandEntry>;
}
