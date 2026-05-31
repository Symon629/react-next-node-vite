/*
 * brandContext.js
 * ---------------------------------------------------------------------------
 * Context used to publish the current brand slice (active strings + config)
 * down the React tree. Kept separate from N8nContext so apps can use either
 * feature in isolation.
 * ---------------------------------------------------------------------------
 */

import React from 'react';

const defaultBrandContext = {
    activeBrandId: null,
    strings: {},
    config: {},
    setActiveBrand: function () { },
    // Also expose the underlying store so advanced consumers can subscribe
    // to non-active-brand changes (e.g. an admin "preview brand" tool).
    store: null,
};

export const BrandContext = React.createContext(defaultBrandContext);
BrandContext.displayName = 'BrandContext';

export default BrandContext;
