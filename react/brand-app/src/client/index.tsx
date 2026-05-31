/*
 * src/client/index.tsx
 * ---------------------------------------------------------------------------
 * Client entry. The brand store is built by `./store` via initBrandsStore(),
 * which reads window.MYBRANDS (HtmlWebpackPlugin / BFF-injected) and falls
 * back to the project's bundled brand data. We just plug it into react-redux.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';

import { store, brandStoreHandle } from './store';
import App from './App';
import '../shared/types'; // augments window.MYBRANDS

const container = document.getElementById('root');
if (!container) throw new Error('#root not found in document');

// Stop polling on full page unload to be a good citizen during HMR.
window.addEventListener('beforeunload', () => brandStoreHandle.stopPolling());

createRoot(container).render(
    <ReduxProvider store={store as never}>
        <App />
    </ReduxProvider>
);
