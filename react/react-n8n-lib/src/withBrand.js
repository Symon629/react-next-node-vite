/*
 * withBrand.js
 * ---------------------------------------------------------------------------
 * HOC that injects { brand, brandStrings, brandConfig, bt } into a wrapped
 * class component. Reads from the consumer's redux store via react-redux's
 * `connect`, which we accept as a parameter to keep `react-redux` out of the
 * lib's hard dependencies.
 *
 *   import { connect } from 'react-redux';
 *   import { compose } from 'redux';
 *   import { withBrand } from 'react-n8n-lib';
 *
 *   export default compose(
 *     connect(mapStateToProps),
 *     withBrand({ slice: (s) => s.brand })
 *   )(LoginScreen);
 *
 * `bt` is a brand-aware translator: bt(key, vars?, fallback?). It uses the
 * active brand's strings and falls back to the key itself, mirroring tt().
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { selectActiveBrand, selectActiveStrings, selectActiveConfig } from './brandStore';
import { makeT, makeTT } from './translate';

function getDisplayName(C) { return C.displayName || C.name || 'Component'; }

/*
 * options:
 *   - slice: (rootState) => brandState   default: state => state.brand
 *   - propName: rename the injected `brand` object
 */
function withBrand(options) {
    var opts = options || {};
    var slice = opts.slice || function (s) { return s && s.brand; };

    return function wrap(Component) {
        class WithBrand extends React.Component {
            // Use legacy context to avoid depending on react-redux directly.
            // Consumer is expected to pass the brand slice down via props
            // (most commonly via connect()).
            render() {
                /*
                 * If parent already mapped brand state via connect, prefer it
                 * (props.brandState). Otherwise expect the whole redux state
                 * on props.__rootState (rare path).
                 */
                var bs = this.props.brandState ||
                    (this.props.__rootState ? slice(this.props.__rootState) : null) ||
                    null;

                var strings = (bs && selectActiveStrings(bs)) || {};
                var config = (bs && selectActiveConfig(bs)) || {};
                var brand = (bs && selectActiveBrand(bs)) || null;

                if (this._cachedFor !== strings) {
                    this._cachedFor = strings;
                    this._bt = makeTT(strings);
                    this._b = makeT(strings);
                }

                var injected = {
                    brand: brand,
                    brandStrings: strings,
                    brandConfig: config,
                    b: this._b,
                    bt: this._bt,
                };

                // Strip helper props before forwarding.
                var rest = Object.assign({}, this.props);
                delete rest.brandState;
                delete rest.__rootState;

                return React.createElement(Component, Object.assign({}, rest, injected));
            }
        }

        WithBrand.displayName = 'withBrand(' + getDisplayName(Component) + ')';
        hoistNonReactStatics(WithBrand, Component);
        return WithBrand;
    };
}

export default withBrand;
export { withBrand };
