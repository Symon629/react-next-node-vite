/*
 * webpack.config.js
 * ---------------------------------------------------------------------------
 * Builds the React client bundle. HtmlWebpackPlugin reads the project's
 * /brands folder at build time and inlines a <script>window.MYBRANDS=...
 * </script> block into index.html via templateParameters. The Node BFF can
 * still override that snapshot at request time on /serveRoot.
 * ---------------------------------------------------------------------------
 */

const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const BRANDS_DIR = path.resolve(__dirname, 'brands');

/*
 * Read the project-local brands folder and produce a window.MYBRANDS payload.
 * Keep this in sync with src/server/brandLoader.ts \u2014 they consume the same
 * filesystem layout.
 */
function readBrandsFromDisk() {
    const manifestPath = path.join(BRANDS_DIR, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const brands = {};
    for (const brandId of manifest.brandIds) {
        const dir = path.join(BRANDS_DIR, brandId);
        const safeRead = (file) => {
            try { return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
            catch { return {}; }
        };
        brands[brandId] = {
            strings: safeRead('strings.json'),
            config: safeRead('config.json'),
        };
    }

    const active = manifest.activeBrandId;
    return {
        projectId: 'brand-app',
        brandName: active,
        environment: process.env.NODE_ENV === 'production' ? 'prod' : 'local',
        brandConfig: (brands[active] && brands[active].config) || {},
        brandStrings: (brands[active] && brands[active].strings) || {},
        // The full registry is also available so the client can switch brands
        // at runtime without an extra fetch.
        brands: brands,
        activeBrandId: active,
    };
}

module.exports = (_env, argv) => {
    const isProd = argv.mode === 'production';
    const brandsPayload = readBrandsFromDisk();

    return {
        entry: './src/client/index.tsx',
        output: {
            path: path.resolve(__dirname, 'dist/public'),
            filename: isProd ? 'assets/[name].[contenthash].js' : 'assets/[name].js',
            publicPath: '/',
            clean: true,
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
            alias: { '@': path.resolve(__dirname, 'src/client') },
        },
        module: {
            rules: [
                { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
                { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
                { test: /\.(svg|png|jpg|jpeg|gif)$/i, type: 'asset' },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/client/index.html',
                inject: 'body',
                templateParameters: {
                    /*
                     * `<%= mybrandsScript %>` in the HTML template is replaced
                     * with an inline window.MYBRANDS snapshot. JSON.stringify
                     * + escape `<` so a string containing "</script>" cannot
                     * break out of the inline tag.
                     */
                    mybrandsScript: brandsPayload
                        ? `<script>window.MYBRANDS=${JSON.stringify(brandsPayload).replace(/</g, '\\u003c')
                        };</script>`
                        : '',
                },
            }),
        ],
        devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
        devServer: {
            port: 3000,
            historyApiFallback: true,
            proxy: [
                { context: ['/serveRoot', '/api'], target: 'http://localhost:4000', changeOrigin: true },
            ],
        },
    };
};
