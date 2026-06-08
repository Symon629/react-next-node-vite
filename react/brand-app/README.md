# brand-app

React + TypeScript client (webpack) plus a Node BFF (Express). The BFF reads
the project-local `/brands` folder and injects a `window.MYBRANDS` snapshot
into the served HTML at request time. The client uses
[`react-n8n-lib`](../react-n8n-lib) `initBrandsStore()` to read that snapshot
and hydrate a redux store.

## Layout

```
brand-app/
├── brands/                          # project-local brand data (overridable)
│   ├── manifest.json
│   ├── tommyHilfiger/{strings,config}.json
│   └── calvinKlein/{strings,config}.json
├── src/
│   ├── client/                      # browser bundle (webpack)
│   │   ├── components/LoginForm.tsx
│   │   ├── hocs/withForm.tsx        # class-based, ref-driven
│   │   ├── hocs/withValidation.tsx  # class-based, layered above withForm
│   │   ├── projectBrands.ts         # bundled brand data fallback
│   │   ├── store.ts                 # initBrandsStore() boot
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.html               # HtmlWebpackPlugin template
│   ├── server/                      # Node BFF (Express)
│   │   ├── brandLoader.ts
│   │   └── index.ts                 # GET /serveRoot, /api/brands
│   └── shared/types.ts              # cross-tier types
├── webpack.config.js                # builds client; injects window.MYBRANDS
├── tsconfig.json                    # client compile
├── tsconfig.server.json             # server compile
└── package.json
```

## How `window.MYBRANDS` gets there

Two layers, in order of precedence (last write wins):

1. **Build time** — `HtmlWebpackPlugin` reads `/brands` from disk and inlines
   a `<script>window.MYBRANDS = {...}</script>` into `index.html` via
   `templateParameters.mybrandsScript`. This is what shows up if you serve
   the static bundle without a BFF.
2. **Request time** — the Node BFF route `GET /serveRoot` re-reads
   `/brands`, recomputes the payload using runtime info (env, host, etc.),
   and rewrites the inline script. Because both scripts are inline assignments
   to `window.MYBRANDS`, the BFF's later block overrides the build-time one.

The shape is:

```ts
{
    projectId:    'brand-app',
    brandName:    'tommyHilfiger',
    environment:  'local' | 'dev' | 'prod',
    brandConfig:  { ... },     // active brand's config
    brandStrings: { ... },     // active brand's strings
    brands:       { ... },     // optional full registry for runtime switching
    activeBrandId: 'tommyHilfiger'
}
```

## Boot flow

```
src/client/index.tsx
  └── store.ts
        └── initBrandsStore({
              projectId, brandName, environment,
              brandConfig, brandStrings, brands,    // bundled fallbacks
              manifestUrl, intervalMs                // GitHub poller
            })
              └── reads window.MYBRANDS → merges → createBrandStore()
                    └── starts brandPoller (GitHub) automatically
```

## Scripts

```bash
# Install once
npm install

# Dev: webpack-dev-server on :3000 + Express BFF on :4000 (proxied)
npm run dev

# Production build + serve
npm run build
npm start                       # node dist/server/index.js, http://localhost:4000/serveRoot
```

## Step-by-step: run it locally end to end

The app depends on the sibling [`react-n8n-lib`](../react-n8n-lib) package
via a `file:` reference. You need to build the library at least once before
the brand app can resolve it.

### 1. Build the library

```bash
cd react-n8n-lib
npm install
npm run build          # produces dist/ via Babel
```

### 2. Install the brand app

```bash
cd ../brand-app
npm install            # pulls in the freshly built react-n8n-lib via file:../react-n8n-lib
```

### 3. Run the dev environment

```bash
npm run dev
```

This starts two processes:

- **webpack-dev-server** on `http://localhost:3000` — bundles the client
  with HMR and inlines `window.MYBRANDS` from disk via `HtmlWebpackPlugin`.
- **Express BFF (ts-node-dev)** on `http://localhost:4000` — exposes
  `GET /serveRoot` (the same HTML, but with `window.MYBRANDS` re-injected
  per request from `brand-app/brands/`).

Open either:

- `http://localhost:3000/` for the dev-server build (auto-reloads).
- `http://localhost:4000/serveRoot` for the BFF-rendered version (matches
  production behaviour).

### 4. Build for production and serve from the BFF

```bash
npm run build          # client → dist/public, server → dist/server
npm start              # node dist/server/index.js
```

Then visit `http://localhost:4000/serveRoot`.

### 5. Switch / edit brands

- Click the brand buttons in the page header to dispatch
  `brandActions.setActive(...)` at runtime.
- Edit `brands/<id>/strings.json` or `brands/<id>/config.json` and reload
  the BFF route — it re-reads the folder on every request in development.

## Local-only mode (no GitHub poller)

By default the brand store **does not** make any external network calls. The
flow is:

1. `HtmlWebpackPlugin` reads `brand-app/brands/` at build time and inlines
   `window.MYBRANDS` into the HTML.
2. The BFF re-injects the same shape per request from disk via `/serveRoot`.
3. `initBrandsStore()` in `src/client/store.ts` reads that snapshot.
4. `GITHUB_MANIFEST_URL` in `src/client/store.ts` is `undefined`, so the
   poller in `react-n8n-lib` is never constructed and no `fetch` is issued
   for brand data.

To opt **in** to live polling for a deployed environment, set
`GITHUB_MANIFEST_URL` in [`src/client/store.ts`](./src/client/store.ts) to
your raw manifest URL (or wire it through webpack's `DefinePlugin`).

## Updating brands

Edit any of:

- `brands/manifest.json` — add/remove a brand id, or change `activeBrandId`
- `brands/<id>/strings.json` — copy
- `brands/<id>/config.json` — feature flags (mfaEnabled, twoFactorEnabled, …)

In dev these are hot — the BFF re-reads them on every `/serveRoot` request.
In prod, the BFF caches the snapshot at boot; restart the server to pick up
changes. Live polling (when enabled — see "Local-only mode" above) lets you
push updates without redeploying.

## HOC composition

Form components compose three layers:

```tsx
compose(
    connect(mapStateToProps),                   // brand strings/config
    withForm({ initialValues: { email: '' } }), // ref-based field registry
    withValidation({                            // ref-based validation
        email:    [required('Email'),    email()],
        password: [required('Password'), minLength(8)],
    }),
)(LoginFormImpl);
```

Both HOCs are class-based and store DOM refs on the instance, so typing into
inputs never re-renders the component tree — only validation and submit do.
See [`src/client/hocs/README.md`](./src/client/hocs/README.md) for the full
HOC API (binders, lifecycle hooks, error flow).