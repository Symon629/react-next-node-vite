/*
 * src/server/index.ts
 * ---------------------------------------------------------------------------
 * Node BFF (Express). Two responsibilities:
 *
 *   1. GET /serveRoot
 *        Reads the local brands folder, takes the index.html produced by the
 *        webpack build, and inlines a <script> that sets window.MYBRANDS
 *        immediately before the bundle <script> tag.
 *
 *   2. Static asset hosting from dist/public so browsers can fetch the
 *      compiled JS/CSS the webpack build emitted.
 *
 * In development, run both webpack-dev-server (port 3000) and this BFF
 * (port 4000); the dev server proxies /serveRoot to here.
 * ---------------------------------------------------------------------------
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { getBrandsPayload } from './brandLoader';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const PUBLIC_DIR = path.resolve(__dirname, '../public');

/*
 * /serveRoot — the entry route the user hits in the browser. Returns the
 * webpack HTML with an injected window.MYBRANDS payload.
 *
 * Security: we JSON.stringify and then escape `<` so a brand string that
 * contains the literal "</script>" cannot break out of the inline script
 * tag. Anything else (quotes, unicode) is already safe inside JSON.
 */
app.get('/serveRoot', (_req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    let html: string;
    try {
        html = fs.readFileSync(indexPath, 'utf8');
    } catch {
        res.status(500).send('Client bundle not built. Run `npm run build:client`.');
        return;
    }

    const payload = getBrandsPayload();
    const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
    const inject =
        `<script>window.MYBRANDS = ${safeJson};</script>`;

    // Insert just before the bundle script (HtmlWebpackPlugin injects in body).
    const out = html.replace('</head>', `${inject}</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Intentionally no caching — brand data is dynamic.
    res.setHeader('Cache-Control', 'no-store');
    res.send(out);
});

/*
 * /api/brands — JSON endpoint for clients that want to fetch brands without
 * a full page reload (e.g. an admin tool switching the active brand).
 */
app.get('/api/brands', (_req, res) => {
    res.json(getBrandsPayload());
});

// Static assets produced by the webpack build (only in production).
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[bff] listening on http://localhost:${PORT}`);
});
