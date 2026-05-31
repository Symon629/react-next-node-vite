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

## Updating brands

Edit any of:

- `brands/manifest.json` — add/remove a brand id, or change `activeBrandId`
- `brands/<id>/strings.json` — copy
- `brands/<id>/config.json` — feature flags (mfaEnabled, twoFactorEnabled, …)

In dev these are hot — the BFF re-reads them on every `/serveRoot` request.
In prod, the BFF caches the snapshot at boot; restart the server to pick up
changes. The optional GitHub poller in `react-n8n-lib` lets you push updates
without redeploying — point `manifestUrl` (in `src/client/store.ts`) at your
GitHub raw URL.

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