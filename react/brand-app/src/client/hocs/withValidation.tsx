/*
 * src/client/hocs/withValidation.tsx
 * ---------------------------------------------------------------------------
 * Class-based HOC layered ABOVE withForm. It intercepts the submit step,
 * runs a validation rules table against the current values (read live via
 * the form ref API), and either:
 *
 *   - Surfaces errors back through form.setErrors and aborts submission.
 *   - Calls the wrapped component's onValidSubmit handler if everything
 *     passed.
 *
 * Designed to compose with withForm via redux's `compose`:
 *
 *   export default compose(
 *     withForm({ initialValues: { email: '', password: '' } }),
 *     withValidation({
 *       email:    [required('email'), email()],
 *       password: [required('password'), minLength(8)],
 *     }),
 *   )(LoginForm);
 *
 * Consumers receive `form.errors` already populated and a stable
 * `validateAndSubmit(onValidSubmit)` helper to use as their submit handler.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import type { FieldValues, FieldErrors, WithFormProps } from './withForm';

export type ValidatorFn = (value: string, allValues: FieldValues) => string | undefined;
export type ValidationRules = Record<string, ValidatorFn[]>;

/* ---- built-in validators ----------------------------------------------- */

export const required = (fieldLabel: string): ValidatorFn =>
    (v) => (v && v.trim().length > 0 ? undefined : `${fieldLabel} is required`);

export const email = (): ValidatorFn =>
    (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'Invalid email');

export const minLength = (n: number): ValidatorFn =>
    (v) => (!v || v.length >= n ? undefined : `Must be at least ${n} characters`);

/* ---- HOC --------------------------------------------------------------- */

export interface WithValidationProps extends WithFormProps {
    /**
     * Wraps a consumer's onValidSubmit and registers it as the form's
     * onBeforeSubmit hook. Returns the same handler so it can be used as
     * a manual submit callback if desired. Validation runs against the
     * live values gathered from the form ref.
     */
    validateAndSubmit: (
        onValidSubmit: (values: FieldValues) => void | Promise<void>
    ) => (values: FieldValues) => Promise<void>;
}

function getDisplayName<P>(C: React.ComponentType<P>): string {
    return C.displayName || C.name || 'Component';
}

export function withValidation(rules: ValidationRules) {
    return function wrap<P extends WithValidationProps>(
        Component: React.ComponentType<P>
    ): React.ComponentClass<Omit<P, keyof WithValidationProps> & WithFormProps> {

        type IncomingProps = Omit<P, keyof WithValidationProps> & WithFormProps;

        class WithValidation extends React.Component<IncomingProps> {
            static displayName = `withValidation(${getDisplayName(Component)})`;

            /*
             * Run every rule for every field. Stops at the first error per
             * field so users see a single, focused message rather than a
             * cascade. Returns `null` if everything is valid.
             */
            private runRules = (values: FieldValues): FieldErrors | null => {
                const errors: FieldErrors = {};
                let hasError = false;
                for (const field of Object.keys(rules)) {
                    const value = values[field] ?? '';
                    for (const rule of rules[field]) {
                        const err = rule(value, values);
                        if (err) {
                            errors[field] = err;
                            hasError = true;
                            break;
                        }
                    }
                }
                return hasError ? errors : null;
            };

            private validateAndSubmit = (
                onValidSubmit: (values: FieldValues) => void | Promise<void>
            ) => {
                const handler = async (values: FieldValues): Promise<void> => {
                    const errs = this.runRules(values);
                    if (errs) {
                        this.props.form.setErrors(errs);
                        // Throwing aborts the bindForm submit chain in withForm.
                        throw new Error('validation_failed');
                    }
                    this.props.form.setErrors({});
                    await onValidSubmit(values);
                };
                this.props.form.setOnBeforeSubmitFn(handler);
                return handler;
            };

            render() {
                return React.createElement(
                    Component as React.ComponentType<WithValidationProps & IncomingProps>,
                    Object.assign({}, this.props, {
                        validateAndSubmit: this.validateAndSubmit,
                    }) as never
                );
            }
        }

        return WithValidation;
    };
}

export default withValidation;