# HOCs in `react-n8n-lib`

Two class-based Higher-Order Components ship with the library. Both are
designed to plug into redux's `compose()` / `connect()` chain.

| HOC                    | Source                                                | Injects                                            |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `withN8nTranslation()` | [`withN8nTranslation.js`](./withN8nTranslation.js)    | `t`, `tt`, `tExists`, `i18n`                       |
| `withBrand()`          | [`withBrand.js`](./withBrand.js)                      | `brand`, `brandStrings`, `brandConfig`, `b`, `bt`  |

---

## `withN8nTranslation(options?)`

Wraps a component so it receives translation helpers backed by an
[n8n](https://n8n.io) Webhook node. Translations are pulled into a React
context by `<N8nProvider>` (further up the tree) and the HOC just consumes
that context.

### Injected props

| Prop      | Signature                              | Purpose                                                                  |
| --------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `t`       | `t(key, fallback?) => string`          | Plain key lookup. Returns the translation, the `fallback`, or the `key`. |
| `tt`      | `tt(key, vars?, fallback?) => string`  | Same as `t` but interpolates `{token}` placeholders from `vars`.         |
| `tExists` | `tExists(key) => boolean`              | Cheap "does this key exist?" check (handy for conditional UI).           |
| `i18n`    | `{ locale, loading, error, setLocale, reload }` | Runtime control surface.                                        |

### Options

```js
withN8nTranslation({
    propName:           't',         // rename the t prop
    templatedPropName:  'tt',        // rename the tt prop
    existsPropName:     'tExists',   // rename the tExists prop
})
```

Calling without options is the typical case — most consumers use the
defaults.

### How it works

```
<N8nProvider> (sets up a context with translations + locale)
        │
        └── withN8nTranslation()(MyScreen)
                │
                ├── reads N8nContext on every render
                ├── memoizes t / tt / tExists by translations identity
                └── forwards props + injects { t, tt, tExists, i18n }
```

The `t`/`tt`/`tExists` functions are cached as long as the underlying
translations object identity stays stable. That matters for `PureComponent`
or `React.memo` children further down — they won't re-render just because
the wrapper re-rendered.

### Minimal usage

```jsx
import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withN8nTranslation } from 'react-n8n-lib';

class HelloScreen extends React.Component {
    render() {
        const { t, tt, user, i18n } = this.props;
        if (i18n.loading) return null;
        return (
            <div>
                <h1>{t('hello')}</h1>
                <p>{tt('greet.user', { name: user.name })}</p>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({ user: state.user });

export default compose(
    connect(mapStateToProps),
    withN8nTranslation(),
)(HelloScreen);
```

Wrap your app once, near the root:

```jsx
<N8nProvider webhookUrl="https://n8n.example.com/webhook/i18n" locale="en">
    <App />
</N8nProvider>
```

---

## `withBrand(options?)`

Injects the active brand's strings, config, and two brand-aware translators
into the wrapped component. Reads from a redux brand slice — typically the
one produced by `createBrandStore` / `initBrandsStore`, but any compatible
shape works.

### Injected props

| Prop           | Type                                      | Purpose                                              |
| -------------- | ----------------------------------------- | ---------------------------------------------------- |
| `brand`        | `{ strings, config } \| null`             | The full active brand entry.                         |
| `brandStrings` | `Record<string, string>`                  | Just the strings of the active brand.                |
| `brandConfig`  | `BrandConfig`                             | Feature flags, theme, variations, etc.               |
| `b`            | `b(key, fallback?) => string`             | Plain brand-string lookup.                           |
| `bt`           | `bt(key, vars?, fallback?) => string`     | Same as `b` but with `{token}` interpolation.        |

### Options

```js
withBrand({
    slice: (rootState) => rootState.brand,  // default: state.brand
    propName: 'brand',                       // rename the brand prop
})
```

### How it reads state

`withBrand` does **not** import `react-redux` directly — that keeps
`react-redux` out of the library's hard dependencies. Instead, it expects
one of two things on its incoming props:

1. `brandState` — already mapped by an outer `connect(mapStateToProps)`.
2. `__rootState` — the whole redux state (rare; mostly for tests).

The most common composition wires `connect` once and uses `withBrand`'s
default slice:

```jsx
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withBrand } from 'react-n8n-lib';

const mapStateToProps = (state) => ({ brandState: state });

class WelcomeScreen extends React.Component {
    render() {
        const { brandStrings, brandConfig, bt } = this.props;
        const accent = brandConfig.theme?.primaryColor ?? '#111';
        return (
            <h1 style={{ color: accent }}>
                {bt('welcome', { name: this.props.user.name })}
            </h1>
        );
    }
}

export default compose(
    connect(mapStateToProps),
    withBrand(),
)(WelcomeScreen);
```

### Memoisation

`b` and `bt` are recomputed only when the active strings object identity
changes. Switching the active brand (`brandActions.setActive(id)`) produces
a new strings reference, so the memo cache is correctly invalidated.

---

## Composing with redux

Both HOCs are designed to live inside a `compose()` chain alongside
`connect()`:

```jsx
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withBrand, withN8nTranslation } from 'react-n8n-lib';

export default compose(
    connect(mapStateToProps, mapDispatchToProps),
    withBrand(),
    withN8nTranslation(),
)(MyScreen);
```

Order matters in two ways:

- `compose` applies right-to-left, so `withN8nTranslation` wraps the inner
  component first and `connect` wraps last (outermost).
- `withBrand` reads `brandState` from props, so any `connect` call that
  populates that prop must appear **before** `withBrand` in the
  source order (i.e. to its left in `compose`).
