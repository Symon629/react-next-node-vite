/*
 * brands/tommyHilfiger/config.js
 * Per-brand feature flags / variations. Anything that should change behaviour
 * (not copy) belongs here. Keep it serialisable so it can be transported via
 * window.MYBRANDS injection from the BFF.
 */
export default {
    brandId: 'tommyHilfiger',
    theme: {
        primaryColor: '#001F5B',
        accentColor: '#CE1126',
        logoUrl: '/brands/tommyHilfiger/logo.svg',
    },
    auth: {
        mfaEnabled: true,
        twoFactorEnabled: false,
        passwordMinLength: 10,
    },
    features: {
        showSocialLogin: true,
        showRememberMe: true,
        showWishlist: true,
        showLiveChat: false,
    },
    variations: {
        loginLayout: 'split',   // 'split' | 'centered' | 'minimal'
        ctaStyle: 'pill',    // 'pill'  | 'square'
    },
};
