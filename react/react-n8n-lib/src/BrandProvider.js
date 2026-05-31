/*
 * BrandProvider.js
 * ---------------------------------------------------------------------------
 * Class-based provider that:
 *   1. On mount, hydrates the brand redux store from window.MYBRANDS (the
 *      payload the Node BFF injected into the served HTML).
 *   2. Optionally starts a GitHub poller that keeps the store in sync with
 *      the remote brands manifest.
 *
 * It does NOT create the redux store itself — the consumer app owns that.
 * Pass `dispatch` (typically `store.dispatch`) plus the GitHub manifest URL.
 *
 *   <BrandProvider
 *     dispatch={store.dispatch}
 *     manifestUrl="https://raw.githubusercontent.com/acme/brands/main/manifest.json"
 *     intervalMs={300000}
 *   >
 *     <App />
 *   </BrandProvider>
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import { brandActions, readWindowBrands } from './brandStore';
import { createBrandPoller } from './brandPoller';

class BrandProvider extends React.Component {
    constructor(props) {
        super(props);
        this._poller = null;
    }

    componentDidMount() {
        var dispatch = this.props.dispatch;
        if (!dispatch) return;

        // 1. Hydrate from window.MYBRANDS (BFF-injected snapshot).
        var injected = readWindowBrands();
        if (injected) {
            dispatch(brandActions.hydrate(injected));
        }

        // 2. Start polling GitHub if a manifest URL was supplied.
        if (this.props.manifestUrl) {
            this._poller = createBrandPoller({
                manifestUrl: this.props.manifestUrl,
                dispatch: dispatch,
                intervalMs: this.props.intervalMs,
                headers: this.props.headers,
            });
            this._poller.start();
        }
    }

    componentWillUnmount() {
        if (this._poller) this._poller.stop();
    }

    render() {
        return this.props.children || null;
    }
}

export default BrandProvider;
