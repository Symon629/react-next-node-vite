# react-n8n-lib

A small React library that exposes a Higher-Order Component (HOC) which
fetches translations from an [n8n](https://n8n.io) Webhook node and injects
two helpers into your class-based components:

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
    ├── N8nProvider.js        # class-based context provider
    ├── withN8nTranslation.js # the HOC – use with compose()/connect()
    ├── n8nContext.js         # React.createContext wrapper
    ├── n8nClient.js          # fetch() wrapper for n8n webhook
    └── translate.js          # makeT / makeTT / interpolate helpers
```

The build step compiles `src/` to `dist/` via Babel.

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

---

## License

MIT
