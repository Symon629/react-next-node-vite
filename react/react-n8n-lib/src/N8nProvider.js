/*
 * N8nProvider.js
 * ---------------------------------------------------------------------------
 * Class-based React provider. Mount this once near the root of the consumer
 * application (typically alongside <Provider /> from react-redux):
 *
 *   <N8nProvider webhookUrl="https://n8n.example.com/webhook/i18n" locale="en">
 *     <ReduxProvider store={store}>
 *       <App />
 *     </ReduxProvider>
 *   </N8nProvider>
 *
 * Responsibilities:
 *   - Fetch the translation dictionary from the configured n8n webhook on
 *     mount and whenever `locale` changes.
 *   - Expose `setLocale` / `reload` so consumers can switch language at
 *     runtime without a full reload.
 *   - Publish { translations, locale, loading, error, setLocale, reload }
 *     through N8nContext so the withN8nTranslation() HOC can read it.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import N8nContext from './n8nContext';
import { fetchTranslations } from './n8nClient';

class N8nProvider extends React.Component {
    constructor(props) {
        super(props);

        /*
         * State holds everything we publish via context. We bind setLocale and
         * reload up-front so their references stay stable, which prevents
         * unnecessary re-renders of HOC-wrapped children that compare context
         * values shallowly.
         */
        this.state = {
            translations: props.initialTranslations || {},
            locale: props.locale || 'en',
            loading: false,
            error: null,
            setLocale: this.handleSetLocale.bind(this),
            reload: this.handleReload.bind(this),
        };

        // Used to cancel an in-flight fetch when locale changes / unmount happens.
        this._abortController = null;
    }

    componentDidMount() {
        // Only fetch if no initial dictionary was provided.
        if (!this.props.initialTranslations) {
            this.loadTranslations(this.state.locale);
        }
    }

    componentDidUpdate(prevProps) {
        /*
         * Allow the parent to drive the locale via prop as well. If the parent
         * passes a new `locale`, sync internal state and re-fetch.
         */
        if (this.props.locale && this.props.locale !== prevProps.locale) {
            this.handleSetLocale(this.props.locale);
        }
    }

    componentWillUnmount() {
        if (this._abortController) {
            this._abortController.abort();
        }
    }

    /*
     * Public handler bound into context: switch locale + refetch.
     */
    handleSetLocale(nextLocale) {
        if (!nextLocale || nextLocale === this.state.locale) {
            return;
        }
        this.setState({ locale: nextLocale }, function () {
            this.loadTranslations(nextLocale);
        }.bind(this));
    }

    /*
     * Public handler bound into context: re-fetch the current locale.
     */
    handleReload() {
        return this.loadTranslations(this.state.locale);
    }

    /*
     * Internal: actually call the n8n webhook and push results into state.
     */
    loadTranslations(locale) {
        // Cancel any prior request so we never publish stale results.
        if (this._abortController) {
            this._abortController.abort();
        }
        this._abortController =
            typeof AbortController !== 'undefined' ? new AbortController() : null;

        var self = this;
        this.setState({ loading: true, error: null });

        return fetchTranslations(this.props.webhookUrl, locale, {
            headers: this.props.headers,
            signal: this._abortController ? this._abortController.signal : undefined,
        })
            .then(function (result) {
                self.setState({
                    translations: result.translations,
                    locale: result.locale,
                    loading: false,
                    error: null,
                });
            })
            .catch(function (err) {
                // Swallow AbortError silently — it just means a newer request started.
                if (err && err.name === 'AbortError') {
                    return;
                }
                self.setState({ loading: false, error: err });
            });
    }

    render() {
        /*
         * NOTE: we render the whole state object directly as the context value.
         * Because we only call setState when something *actually* changed,
         * consumers re-render only when needed.
         */
        return (
            <N8nContext.Provider value={this.state}>
                {this.props.children}
            </N8nContext.Provider>
        );
    }
}

export default N8nProvider;
