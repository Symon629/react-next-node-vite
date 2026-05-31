/*
 * withN8nTranslation.js
 * ---------------------------------------------------------------------------
 * Higher-Order Component (HOC) that injects three props into the wrapped
 * component:
 *
 *    t       (key, fallback?)         -> string
 *    tt      (key, vars?, fallback?)  -> string (interpolated)
 *    i18n    { locale, loading, error, setLocale, reload }
 *
 * Designed to be used with redux's `compose()` and `connect()` so the
 * consumer can write things like:
 *
 *    import { compose } from 'redux';
 *    import { connect } from 'react-redux';
 *    import { withN8nTranslation } from 'react-n8n-lib';
 *
 *    class MyScreen extends React.Component {
 *      render() {
 *        const { t, tt, user } = this.props;
 *        return (
 *          <div>
 *            <h1>{t('hello')}</h1>
 *            <p>{tt('greet.user', { name: user.name })}</p>
 *          </div>
 *        );
 *      }
 *    }
 *
 *    export default compose(
 *      connect(mapStateToProps, mapDispatchToProps),
 *      withN8nTranslation()
 *    )(MyScreen);
 *
 * The HOC is called as a *factory* (`withN8nTranslation()`) so future
 * options can be added without breaking changes. Calling it without options
 * is the typical case.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import N8nContext from './n8nContext';
import { makeT, makeTT } from './translate';

/*
 * Helper for the displayName so React DevTools shows something useful like
 * "withN8nTranslation(MyScreen)" instead of just "Component".
 */
function getDisplayName(Component) {
    return Component.displayName || Component.name || 'Component';
}

/*
 * withN8nTranslation(options?) -> (Component) -> WrappedComponent
 *
 * options:
 *   - propName: rename `t` to something else (default: 't')
 *   - templatedPropName: rename `tt` (default: 'tt')
 */
function withN8nTranslation(options) {
    var opts = options || {};
    var tName = opts.propName || 't';
    var ttName = opts.templatedPropName || 'tt';

    /*
     * Return a function (not the wrapped component directly) so the call site
     * looks like compose(connect(...), withN8nTranslation())(MyComp).
     * This matches the curried signature compose() expects.
     */
    return function wrap(Component) {
        class WithN8nTranslation extends React.Component {
            /*
             * Cache the generated t/tt functions so their identity stays stable
             * as long as the translations object identity stays stable. This
             * matters for PureComponent / React.memo children.
             */
            constructor(props) {
                super(props);
                this._cachedFor = null;
                this._t = null;
                this._tt = null;
            }

            buildHelpers(translations) {
                if (this._cachedFor !== translations) {
                    this._cachedFor = translations;
                    this._t = makeT(translations);
                    this._tt = makeTT(translations);
                }
            }

            render() {
                var self = this;
                return (
                    <N8nContext.Consumer>
                        {function (ctx) {
                            self.buildHelpers(ctx.translations);

                            /*
                             * Build the props bag explicitly with computed keys so the
                             * `propName` / `templatedPropName` options work.
                             */
                            var injected = {};
                            injected[tName] = self._t;
                            injected[ttName] = self._tt;
                            injected.i18n = {
                                locale: ctx.locale,
                                loading: ctx.loading,
                                error: ctx.error,
                                setLocale: ctx.setLocale,
                                reload: ctx.reload,
                            };

                            return React.createElement(
                                Component,
                                Object.assign({}, self.props, injected)
                            );
                        }}
                    </N8nContext.Consumer>
                );
            }
        }

        WithN8nTranslation.displayName =
            'withN8nTranslation(' + getDisplayName(Component) + ')';

        /*
         * Forward static methods (like Component.fetchData, navigationOptions,
         * etc.) so the HOC is transparent. Standard practice for HOCs.
         */
        return hoistNonReactStatics(WithN8nTranslation, Component);
    };
}

export default withN8nTranslation;
