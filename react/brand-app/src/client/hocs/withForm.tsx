/*
 * src/client/hocs/withForm.tsx
 * ---------------------------------------------------------------------------
 * Class-based HOC that turns the wrapped component into a "form host". It
 * uses uncontrolled inputs and gathers their values via refs registered by
 * the wrapped component, so consumers can keep their JSX simple.
 *
 *   class LoginForm extends React.Component<WithFormProps> {
 *     render() {
 *       const { register, handleSubmit, values, errors } = this.props.form;
 *       return (
 *         <form onSubmit={handleSubmit(this.onSubmit)}>
 *           <input ref={register('email')}    defaultValue={values.email} />
 *           <input ref={register('password')} type="password" />
 *           <button type="submit">Submit</button>
 *         </form>
 *       );
 *     }
 *     onSubmit = (values: Record<string, string>) => { ... };
 *   }
 *
 *   export default withForm({ initialValues: { email: '' } })(LoginForm);
 *
 * The HOC stores ALL field refs in a class instance Map (no React state), so
 * typing into an input never triggers a re-render. State changes only happen
 * on submit (or when withValidation, layered above, decides to surface
 * errors).
 * ---------------------------------------------------------------------------
 */

import React from 'react';

export type FieldRefMap = Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>;
export type FieldValues = Record<string, string>;
export type FieldErrors = Record<string, string | undefined>;

export interface FormApi {
    register: (name: string) => React.RefCallback<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    /** Read all current input values (live from the DOM). */
    getValues: () => FieldValues;
    /** Wraps a submit handler so it receives the gathered values map. */
    handleSubmit: (
        onSubmit: (values: FieldValues) => void | Promise<void>
    ) => (e: React.FormEvent<HTMLFormElement>) => void;
    /** Initial values supplied to the HOC (consumers use them as defaultValue). */
    values: FieldValues;
    /** Errors surfaced by withValidation (empty if not composed). */
    errors: FieldErrors;
    /** Imperatively set/clear errors from the consumer if needed. */
    setErrors: (errors: FieldErrors) => void;
}

export interface WithFormProps {
    form: FormApi;
}

export interface WithFormOptions {
    initialValues?: FieldValues;
}

interface WithFormState {
    errors: FieldErrors;
}

function getDisplayName<P>(C: React.ComponentType<P>): string {
    return C.displayName || C.name || 'Component';
}

export function withForm(options: WithFormOptions = {}) {
    const initialValues = options.initialValues || {};

    return function wrap<P extends WithFormProps>(
        Component: React.ComponentType<P>
    ): React.ComponentClass<Omit<P, keyof WithFormProps>> {

        class WithForm extends React.Component<Omit<P, keyof WithFormProps>, WithFormState> {
            static displayName = `withForm(${getDisplayName(Component)})`;

            // Refs live on the instance, NOT in state — no re-renders on keystroke.
            private fieldRefs: FieldRefMap = new Map();

            state: WithFormState = { errors: {} };

            private register = (name: string): React.RefCallback<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> => {
                return (el) => {
                    if (el) this.fieldRefs.set(name, el);
                    else this.fieldRefs.delete(name);
                };
            };

            private getValues = (): FieldValues => {
                const out: FieldValues = {};
                this.fieldRefs.forEach((el, name) => {
                    out[name] = el ? (el as HTMLInputElement).value : '';
                });
                // Include any initialValues that haven't been registered yet so
                // consumers always see a complete shape on submit.
                Object.keys(initialValues).forEach((k) => {
                    if (!(k in out)) out[k] = initialValues[k];
                });
                return out;
            };

            private setErrors = (errors: FieldErrors) => {
                this.setState({ errors });
            };

            private handleSubmit = (
                onSubmit: (values: FieldValues) => void | Promise<void>
            ) => (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const values = this.getValues();
                Promise.resolve(onSubmit(values)).catch(() => { /* consumer owns errors */ });
            };

            render() {
                const formApi: FormApi = {
                    register: this.register,
                    getValues: this.getValues,
                    handleSubmit: this.handleSubmit,
                    values: initialValues,
                    errors: this.state.errors,
                    setErrors: this.setErrors,
                };
                return React.createElement(
                    Component as React.ComponentType<WithFormProps & typeof this.props>,
                    Object.assign({}, this.props, { form: formApi }) as never
                );
            }
        }

        return WithForm;
    };
}

export default withForm;