/*
 * src/client/components/LoginForm.tsx
 * ---------------------------------------------------------------------------
 * Class-based login form composed of:
 *
 *   compose(
 *     connect(mapStateToProps),     // injects brand state from redux
 *     withForm({...}),              // ref-based field registration
 *     withValidation({...}),        // ref-based validation
 *   )(LoginForm)
 *
 * Demonstrates how brand-driven copy (strings) and brand-driven behaviour
 * (config.auth.mfaEnabled / twoFactorEnabled) flow into a single component.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import {
    selectActiveStrings,
    selectActiveConfig,
} from 'react-n8n-lib';

import type { RootState } from '../store';
import type { BrandConfig, BrandStrings } from '../../shared/types';
import { withForm, type WithFormProps } from '../hocs/withForm';
import { withValidation, type WithValidationProps, required, email, minLength } from '../hocs/withValidation';

interface OwnProps { }
interface StateProps {
    strings: BrandStrings;
    config: BrandConfig;
}
type Props = OwnProps & StateProps & WithValidationProps;

class LoginFormImpl extends React.Component<Props> {
    private onValidSubmit = (values: Record<string, string>) => {
        // Real apps would dispatch an auth thunk here. Keeping it local for the
        // skeleton so the example stays self-contained.
        // eslint-disable-next-line no-alert
        alert('Submitting:\n' + JSON.stringify(values, null, 2));
    };

    render() {
        const { strings, config, form, validateAndSubmit } = this.props;
        const ctaShape = config.variations?.ctaStyle === 'square' ? 0 : 999;
        const accent = config.theme?.primaryColor || '#111';

        return (
            <form onSubmit={validateAndSubmit(this.onValidSubmit)} noValidate>
                <h2>{strings['login.welcome'] ?? 'Welcome'}</h2>

                <label style={{ display: 'block', marginBottom: 12 }}>
                    {strings['form.email.label'] ?? 'Email'}
                    <input
                        ref={form.register('email')}
                        defaultValue={form.values.email ?? ''}
                        type="email"
                        autoComplete="username"
                        style={{ display: 'block', width: '100%' }}
                    />
                    {form.errors.email && (
                        <small style={{ color: 'crimson' }}>{form.errors.email}</small>
                    )}
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                    {strings['form.password.label'] ?? 'Password'}
                    <input
                        ref={form.register('password')}
                        type="password"
                        autoComplete="current-password"
                        style={{ display: 'block', width: '100%' }}
                    />
                    {form.errors.password && (
                        <small style={{ color: 'crimson' }}>{form.errors.password}</small>
                    )}
                </label>

                {config.auth?.mfaEnabled && (
                    <label style={{ display: 'block', marginBottom: 12 }}>
                        {strings['login.mfa.prompt'] ?? 'MFA code'}
                        <input
                            ref={form.register('mfaCode')}
                            type="text"
                            inputMode="numeric"
                            style={{ display: 'block', width: '100%' }}
                        />
                    </label>
                )}

                {config.auth?.twoFactorEnabled && (
                    <label style={{ display: 'block', marginBottom: 12 }}>
                        {strings['login.2fa.prompt'] ?? '2FA code'}
                        <input
                            ref={form.register('twoFactorCode')}
                            type="text"
                            inputMode="numeric"
                            style={{ display: 'block', width: '100%' }}
                        />
                    </label>
                )}

                <button
                    type="submit"
                    style={{
                        background: accent, color: 'white', border: 0,
                        padding: '10px 20px', borderRadius: ctaShape, cursor: 'pointer',
                    }}
                >
                    {strings['login.cta'] ?? 'Submit'}
                </button>
            </form>
        );
    }
}

const mapStateToProps = (s: RootState): StateProps => ({
    strings: selectActiveStrings(s) as BrandStrings,
    config: selectActiveConfig(s) as BrandConfig,
});

const minPwLen = 8; // floor; brand config.auth.passwordMinLength can raise it at runtime via custom rules

const LoginForm = compose(
    connect(mapStateToProps),
    withForm({ initialValues: { email: '', password: '' } }),
    withValidation({
        email: [required('Email'), email()],
        password: [required('Password'), minLength(minPwLen)],
    }),
)(LoginFormImpl as unknown as React.ComponentType<WithFormProps>) as unknown as React.ComponentType<OwnProps>;

export default LoginForm;