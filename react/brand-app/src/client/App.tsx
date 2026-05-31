/*
 * src/client/App.tsx
 * ---------------------------------------------------------------------------
 * Top-level component. Subscribes to the brand slice via react-redux and
 * renders a brand-aware login form built from the withForm + withValidation
 * HOCs to demonstrate the moving parts.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    brandActions,
    selectActiveStrings,
    selectActiveConfig,
    selectBrandMeta,
} from 'react-n8n-lib';

import type { RootState } from './store';
import LoginForm from './components/LoginForm';

const App: React.FC = () => {
    const dispatch = useDispatch();
    const brandState = useSelector((s: RootState) => s);
    const strings = useSelector((s: RootState) => selectActiveStrings(s));
    const config = useSelector((s: RootState) => selectActiveConfig(s));
    const meta = useSelector((s: RootState) => selectBrandMeta(s));
    const brandIds = Object.keys(brandState.brands);

    return (
        <main style={{
            fontFamily: 'system-ui, sans-serif',
            padding: 24,
            color: config.theme?.primaryColor ?? '#111',
        }}>
            <header style={{ marginBottom: 24 }}>
                <h1>{strings['app.title'] ?? 'App'}</h1>
                <p>
                    Project: <strong>{meta.projectId}</strong>
                    {' · '}
                    Env: <strong>{meta.environment}</strong>
                    {' · '}
                    Brand: <strong>{brandState.activeBrandId}</strong>
                </p>
                <p>
                    MFA: {String(config.auth?.mfaEnabled)}
                    {' · '}
                    2FA: {String(config.auth?.twoFactorEnabled)}
                </p>
                <div>
                    Switch brand:{' '}
                    {brandIds.map(id => (
                        <button
                            key={id}
                            onClick={() => dispatch(brandActions.setActive(id))}
                            style={{ marginRight: 8 }}
                        >
                            {id}
                        </button>
                    ))}
                </div>
            </header>

            <LoginForm />
        </main>
    );
};

export default App;
