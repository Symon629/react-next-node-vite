/*
 * src/shared/types.ts
 * ---------------------------------------------------------------------------
 * Types shared by both the client bundle and the Node BFF. Anything that
 * crosses the wire (window.MYBRANDS payload, /api responses) lives here.
 * ---------------------------------------------------------------------------
 */

export interface BrandStrings {
    [key: string]: string;
}

export interface BrandAuthConfig {
    mfaEnabled: boolean;
    twoFactorEnabled: boolean;
    passwordMinLength: number;
}

export interface BrandFeatures {
    showSocialLogin: boolean;
    showRememberMe: boolean;
    showWishlist: boolean;
    showLiveChat: boolean;
}

export interface BrandVariations {
    loginLayout: 'split' | 'centered' | 'minimal';
    ctaStyle: 'pill' | 'square';
}

export interface BrandConfig {
    brandId: string;
    theme: { primaryColor: string; accentColor?: string; logoUrl?: string };
    auth: BrandAuthConfig;
    features: BrandFeatures;
    variations: BrandVariations;
}

export interface BrandEntry {
    strings: BrandStrings;
    config: BrandConfig;
}

/*
 * Shape injected into the page by HtmlWebpackPlugin (build time) and/or the
 * BFF /serveRoot (request time). The single-active-brand fields (brandName,
 * brandConfig, brandStrings) are what react-n8n-lib's initBrandsStore reads
 * first; `brands` + `activeBrandId` is the optional multi-brand registry
 * for runtime brand switching.
 */
export interface BrandsPayload {
    projectId: string;
    brandName: string;
    environment: 'local' | 'dev' | 'prod';
    brandConfig: BrandConfig;
    brandStrings: BrandStrings;
    brands?: { [brandId: string]: BrandEntry };
    activeBrandId?: string;
}

declare global {
    interface Window {
        MYBRANDS?: BrandsPayload;
    }
}

export { };
