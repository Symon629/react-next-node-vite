# react-n8n-lib

A small React library with two cooperating subsystems:

1. **n8n translations** — a class-based HOC that fetches translations from an
   [n8n](https://n8n.io) Webhook node and injects `t()` / `tt()` helpers into
   your components.
2. **Brand store** — a redux reducer + factory that holds per-brand `strings`
   and `config` (mfa flags, 2fa flags, theme, variations…), seeded from a
   `window.MYBRANDS` payload injected by your server / HTML webpack plugin
   and optionally kept in sync with a GitHub-hosted manifest via a poller.

Both subsystems are designed to plug into Redux's `compose()` / `connect()`
chain and to work side-by-side without depending on each other.

> Looking for the per-HOC API (props, lifecycle, options)? See
> [`src/HOCs.md`](./src/HOCs.md).

## n8n translation HOC props

| Prop | Signature | Purpose |
| ---- | --------- | ------- |
| `t`  | `t(key, fallback?)` | Plain lookup. Returns the translated string or the `fallback` / `key`. |
| `tt` | `tt(key, vars?, fallback?)` | Same as `t` but also interpolates `{token}` placeholders from `vars`. |
| `i18n` | `{ locale, loading, error, setLocale, reload }` | Runtime control. |

It is designed to plug into Redux's `compose()` / `connect()` chain.

---

## Project layout

```
react-n8n-lib/
├── .babelrc
├── package.json
├── README.md
└── src/
    ├── index.js              # public entry – exports below
    ├── N8nProvider.js        # class-based context provider (i18n)
    ├── withN8nTranslation.js # the i18n HOC – use with compose()/connect()
    ├── n8nContext.js         # React.createContext wrapper
    ├── n8nClient.js          # fetch() wrapper for n8n webhook
    ├── translate.js          # makeT / makeTT / interpolate helpers
    │
    ├── brandStore.js         # brand reducer + createBrandStore + initBrandsStore
    ├── brandPoller.js        # GitHub manifest poller (ETag-aware)
    ├── brandContext.js       # React.createContext wrapper (brand)
    ├── BrandProvider.js      # class-based brand bootstrap helper
    ├── withBrand.js          # brand HOC – injects { brandStrings, brandConfig, b, bt }
    └── brands/
        ├── index.js          # static fallback registry
        ├── tommyHilfiger/{strings,config}.js
        └── calvinKlein/{strings,config}.js
```

The build step compiles `src/` to `dist/` via Babel.

---

## Brand subsystem

### What it does

- Holds a redux state slice describing the active brand and any other brands
  the app might switch to:

  ```js
  state.brand = {
      meta:          { projectId, brandName, environment },
      activeBrandId: 'tommyHilfiger',
      brands: {
          tommyHilfiger: { strings: {...}, config: {...} },
          calvinKlein:   { strings: {...}, config: {...} },
      },
      status:        'idle' | 'polling' | 'error',
      lastUpdatedAt: number | null,
      error:         Error  | null,
  }
  ```

- Reads `window.MYBRANDS` (injected by your BFF / HTML webpack plugin) to
  hydrate the store on first render — no flash of unbranded content.
- Optionally polls a GitHub-hosted manifest at a configurable cadence so
  brand updates can be shipped without a redeploy.
- Exposes selectors and an HOC so class components can pull brand strings
  / config without manual `mapStateToProps`.

### Expected `window.MYBRANDS` shape

The BFF (or `HtmlWebpackPlugin` `templateParameters`) is expected to inject
something like this in the document `<head>`, before the bundle:

```html
<script>
window.MYBRANDS = {
    projectId:    'brand-app',
    brandName:    'tommyHilfiger',
    environment:  'local' | 'dev' | 'prod',
    brandConfig:  { /* active brand config */ },
    brandStrings: { /* active brand strings */ },
    // optional, for runtime brand switching:
    brands: {
        tommyHilfiger: { strings: {...}, config: {...} },
        calvinKlein:   { strings: {...}, config: {...} }
    },
    activeBrandId: 'tommyHilfiger'
};
</script>
```

`readWindowBrands()` is defensive: malformed payloads are dropped and the
static registry shipped with the library is used as a fallback.

### Recommended bootstrap (single-store apps)

```jsx
// src/client/store.ts
import { initBrandsStore } from 'react-n8n-lib';
import { projectBrands, DEFAULT_BRAND_NAME } from './projectBrands';

export const handle = initBrandsStore({
    projectId:    'brand-app',
    brandName:    DEFAULT_BRAND_NAME,
    environment:  process.env.NODE_ENV === 'production' ? 'prod' : 'local',
    brandConfig:  projectBrands[DEFAULT_BRAND_NAME].config,
    brandStrings: projectBrands[DEFAULT_BRAND_NAME].strings,
    brands:       projectBrands,                       // optional multi-brand map
    manifestUrl:  'https://raw.githubusercontent.com/acme/brands/main/manifest.json',
    intervalMs:   5 * 60 * 1000,                       // 5 min poll
});

export const store = handle.store;
```

```jsx
// src/client/index.tsx
import { Provider } from 'react-redux';
import { store } from './store';

createRoot(document.getElementById('root')!).render(
    <Provider store={store as never}>
        <App />
    </Provider>
);
```

That is enough — `initBrandsStore` will:

1. Read `window.MYBRANDS` and merge it over the supplied fallbacks.
2. Throw at boot if `projectId`, `brandName` or `environment` are missing
   (so misconfigured deployments fail loudly).
3. Start the GitHub poller automatically if `manifestUrl` is provided.

### GitHub manifest layout (for the poller)

```
brands/
  manifest.json
  tommyHilfiger/{strings.json,config.json}
  calvinKlein/{strings.json,config.json}
```

```json
// manifest.json
{
  "tommyHilfiger": { "strings": "tommyHilfiger/strings.json", "config": "tommyHilfiger/config.json" },
  "calvinKlein":   { "strings": "calvinKlein/strings.json",   "config": "calvinKlein/config.json" }
}
```

Point `manifestUrl` at the raw URL of `manifest.json`. The poller respects
`ETag` so unchanged responses do not trigger a redux dispatch.

### Reading brand data inside components

Three options, pick whichever fits:

```jsx
// 1) hooks (functional consumers)
import { useSelector } from 'react-redux';
import { selectActiveStrings, selectActiveConfig } from 'react-n8n-lib';

const strings = useSelector(selectActiveStrings);
const config  = useSelector(selectActiveConfig);
```

```jsx
// 2) class component + connect()
const mapStateToProps = (s) => ({
    strings: selectActiveStrings(s),
    config:  selectActiveConfig(s),
});
export default connect(mapStateToProps)(MyScreen);
```

```jsx
// 3) the withBrand() HOC — also gives you b() / bt() translators
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withBrand } from 'react-n8n-lib';

class Hello extends React.Component {
    render() {
        const { brandConfig, bt } = this.props;
        return <h1 style={{ color: brandConfig.theme.primaryColor }}>{bt('login.welcome')}</h1>;
    }
}
export default compose(
    connect((s) => ({ brandState: s })),
    withBrand(),
)(Hello);
```

### Switching the active brand at runtime

```js
import { brandActions } from 'react-n8n-lib';
store.dispatch(brandActions.setActive('calvinKlein'));
```

---

## n8n side – expected workflow

1. **Webhook** node (HTTP Method `GET`, e.g. path `/webhook/i18n`).
2. A **Function / Set** node returning JSON:

```json
{
  "locale": "en",
  "translations": {
    "hello":       "Hello",
    "greet.user":  "Hello, {name}!",
    "items.count": "You have {count} items"
  }
}
```

3. **Respond to Webhook** node.

The library appends `?locale=<code>` to the webhook URL, so you can branch on
it inside the workflow (e.g. with a Switch node) to return different dictionaries.

---

## Building the library locally

```bash
# 1. Install dev deps (only needed once)
npm install

# 2. Build src/ -> dist/
npm run build
```

This produces a `dist/` folder ready to be published or packed.

---

## Packing into a tarball for local consumption

The flow is: **build → npm pack → install the .tgz in your consumer app**.
This is the recommended way to test a private library on your machine
without publishing to npm.

### 1) Create the tarball

From the library root:

```bash
npm run pack:local
```

That script runs `npm run build` and then `npm pack`. You will end up with a
file like:

```
react-n8n-lib-0.1.0.tgz
```

in the library's root folder. The tarball contains only what `"files"` in
`package.json` whitelists (`dist/`, `README.md`, `LICENSE`).

> Tip: run `npm pack --dry-run` first to inspect what would be included.

### 2) Install the tarball into a consumer React app

In your consumer project (typically a Create React App project), point npm
at the absolute path of the `.tgz`:

```bash
cd /path/to/your-cra-app
npm install /absolute/path/to/react-n8n-lib/react-n8n-lib-0.1.0.tgz
```

You should then see this in the consumer's `package.json`:

```json
"dependencies": {
  "react-n8n-lib": "file:../react-n8n-lib/react-n8n-lib-0.1.0.tgz"
}
```

To pick up a new build, repeat steps 1–2. CRA / webpack will hash the new
tarball and refresh it. If it does not, delete the cached copy:

```bash
rm -rf node_modules/react-n8n-lib
npm install /absolute/path/to/react-n8n-lib/react-n8n-lib-0.1.0.tgz
```

### Alternative – `npm link`

If you prefer live updates without re-packing:

```bash
# in react-n8n-lib/
npm run build
npm link

# in your-cra-app/
npm link react-n8n-lib
```

You will need to re-run `npm run build` in the library after every code
change, because CRA consumes the built `dist/` output.

---

## Using the library in a consumer Create React App

### 1) Wrap your tree in `<N8nProvider />`

```jsx
// src/index.js of your CRA app
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import { N8nProvider } from 'react-n8n-lib';

import store from './store';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <N8nProvider
    webhookUrl="https://your-n8n.example.com/webhook/i18n"
    locale="en"
  >
    <ReduxProvider store={store}>
      <App />
    </ReduxProvider>
  </N8nProvider>
);
```

### 2) Use the HOC on a class component, composed with `connect()`

```jsx
import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withN8nTranslation } from 'react-n8n-lib';

class ProfileScreen extends React.Component {
  render() {
    const { t, tt, user, i18n } = this.props;

    if (i18n.loading) return <p>{t('loading', 'Loading…')}</p>;
    if (i18n.error)   return <p>{t('error',   'Something went wrong')}</p>;

    return (
      <section>
        <h1>{t('hello')}</h1>
        <p>{tt('greet.user', { name: user.name })}</p>
        <button onClick={() => i18n.setLocale('fr')}>FR</button>
        <button onClick={() => i18n.setLocale('en')}>EN</button>
      </section>
    );
  }
}

const mapStateToProps = (state) => ({ user: state.user });

export default compose(
  connect(mapStateToProps),
  withN8nTranslation()
)(ProfileScreen);
```

### 3) Or use the HOC alone (no Redux)

```jsx
import { withN8nTranslation } from 'react-n8n-lib';

class Hello extends React.Component {
  render() {
    const { t } = this.props;
    return <h1>{t('hello')}</h1>;
  }
}

export default withN8nTranslation()(Hello);
```

---

## API reference

### `<N8nProvider />`

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `webhookUrl` | `string` (required) | Full URL of the n8n Webhook node. |
| `locale` | `string` | Initial locale. Default `'en'`. |
| `headers` | `object` | Extra headers passed to `fetch`. |
| `initialTranslations` | `object` | If provided, skips the first fetch. |
| `children` | `node` | Your app. |

### `withN8nTranslation(options?)`

Returns an HOC `(Component) => WrappedComponent`. Options:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `propName` | `string` | `'t'`  | Rename the `t` prop. |
| `templatedPropName` | `string` | `'tt'` | Rename the `tt` prop. |

### Other named exports

- `N8nContext` – the raw `React.Context`, if you want `static contextType = N8nContext`.
- `fetchTranslations(webhookUrl, locale, options?)` – the underlying fetch helper.
- `makeT`, `makeTT`, `interpolate` – pure helpers, useful for unit tests.

### Brand subsystem exports

| Export | Purpose |
| ------ | ------- |
| `createBrandStore({ projectId, brandName, environment, brandConfig, brandStrings, brands?, manifestUrl?, intervalMs?, autoStartPoller?, headers? })` | Build a self-contained brand redux store. Returns `{ store, startPolling, stopPolling, pollNow, getMeta }`. Throws if `projectId` / `brandName` / `environment` are missing. |
| `initBrandsStore(overrides?)` | Same as `createBrandStore`, but reads `window.MYBRANDS` first and merges `overrides` on top. The recommended client-side bootstrap. |
| `brandReducer`, `BRAND_ACTIONS`, `brandActions` | Lower-level pieces for apps that already own a redux store and want to plug `brandReducer` into their own `combineReducers()`. |
| `selectActiveBrand`, `selectActiveStrings`, `selectActiveConfig`, `selectBrandMeta` | Selectors over the brand state. |
| `getInitialBrandState`, `readWindowBrands` | Lower-level building blocks. |
| `createBrandPoller({ manifestUrl, dispatch, intervalMs?, headers? })` | Standalone GitHub poller, in case `createBrandStore` is too opinionated. |
| `BrandProvider` | Class-based React lifecycle wrapper that hydrates from `window.MYBRANDS` and starts a poller. Optional — `initBrandsStore` already does both. |
| `withBrand(options?)` | HOC that injects `{ brand, brandStrings, brandConfig, b, bt }` into a wrapped component. |
| `staticBrands` | The brand registry shipped with the library (Tommy Hilfiger + Calvin Klein). Useful as a fallback or test fixture. |

---

## License

MIT
