/*
 * src/client/hocs/withForm.tsx
 * ---------------------------------------------------------------------------
 * Redux-connected, class-based form HOC. The wrapped component renders the
 * form markup and uses three binders exposed on `this.props.form`:
 *
 *   bindForm()          → props for the <form> element (ref + onSubmit)
 *   bindInput(name)     → props for each <input>/<select>/<textarea>
 *   submitForm()        → imperative submit (also runs onBeforeSubmitFn)
 *
 * On mount the HOC walks the form ref to discover field names, picks the
 * matching slice from the redux `form` prop, and dispatches
 * FORM_UNVALIDATE.MERGE_INTO_FORM so the redux form slice is seeded from
 * whatever the consumer passed in. It then scrolls to the top of the page.
 *
 * The wrapped component can register lifecycle callbacks via:
 *
 *   this.props.form.setOnFormStartFn(fn)     // called once on first edit
 *   this.props.form.setOnBeforeSubmitFn(fn)  // called before submit fires
 *
 * The original `onSubmit` (if provided as a prop) is invoked at the end of
 * `bindForm`'s submit handler with the gathered field values.
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import { connect } from 'react-redux';

export type FieldValues = Record<string, string>;
export type FieldErrors = Record<string, string | undefined>;

/* ---- redux action constants -------------------------------------------- */

export const FORM_UNVALIDATE = {
    MERGE_INTO_FORM: 'FORM_UNVALIDATE/MERGE_INTO_FORM' as const,
};

/* ---- form API exposed to the wrapped component ------------------------- */

export interface FormBindings {
    ref: React.RefObject<HTMLFormElement>;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export interface InputBindings {
    name: string;
    defaultValue: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export interface FormApi {
    bindForm: () => FormBindings;
    bindInput: (name: string) => InputBindings;
    submitForm: () => void;
    setOnFormStartFn: (fn: () => void) => void;
    setOnBeforeSubmitFn: (fn: (values: FieldValues) => void | Promise<void>) => void;
    /** Snapshot of values gathered from the form ref. */
    getValues: () => FieldValues;
    /** Errors surfaced by withValidation (empty if not composed). */
    errors: FieldErrors;
    setErrors: (errors: FieldErrors) => void;
    /** Initial values supplied to the HOC. */
    values: FieldValues;
}

export interface WithFormProps {
    form: FormApi;
}

export interface WithFormOptions {
    initialValues?: FieldValues;
}

/* Extra props the HOC consumes from the wrapper / redux. */
interface InjectedProps {
    dispatch: (action: { type: string; model?: FieldValues }) => void;
    form?: FieldValues;
    onSubmit?: (values: FieldValues) => void | Promise<void>;
}

interface WithFormState {
    errors: FieldErrors;
}

/* ---- helpers ----------------------------------------------------------- */

function getDisplayName<P>(C: React.ComponentType<P>): string {
    return C.displayName || C.name || 'Component';
}

function getFieldNamesFromRef(formEl: HTMLFormElement | null): string[] {
    if (!formEl) return [];
    const names = new Set<string>();
    const elements = formEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input[name], textarea[name], select[name]'
    );
    elements.forEach((el) => { if (el.name) names.add(el.name); });
    return Array.from(names);
}

function pick<T extends Record<string, unknown>>(src: T | undefined, keys: string[]): FieldValues {
    const out: FieldValues = {};
    if (!src) return out;
    for (const k of keys) {
        const v = src[k];
        if (v !== undefined) out[k] = String(v);
    }
    return out;
}

function scrollUp(): void {
    if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
}

/* ---- HOC --------------------------------------------------------------- */

export function withForm(options: WithFormOptions = {}) {
    const initialValues = options.initialValues || {};

    return function wrap<P extends WithFormProps>(
        Component: React.ComponentType<P>
    ): React.ComponentType<Omit<P, keyof WithFormProps> & { onSubmit?: (values: FieldValues) => void | Promise<void> }> {

        type IncomingProps = Omit<P, keyof WithFormProps> & InjectedProps;

        class WithForm extends React.Component<IncomingProps, WithFormState> {
            static displayName = `withForm(${getDisplayName(Component)})`;

            private formRef: React.RefObject<HTMLFormElement> = React.createRef();
            private formStarted = false;
            private onFormStartFn: (() => void) | null = null;
            private onBeforeSubmitFn: ((values: FieldValues) => void | Promise<void>) | null = null;

            state: WithFormState = { errors: {} };

            componentDidMount(): void {
                const { dispatch, form } = this.props;
                const fieldNames = getFieldNamesFromRef(this.formRef.current);
                const model = pick(form as Record<string, unknown> | undefined, fieldNames);
                dispatch({ type: FORM_UNVALIDATE.MERGE_INTO_FORM, model });
                scrollUp();
            }

            /* --- callback setters available to the wrapped component ---- */

            private setOnFormStartFn = (fn: () => void): void => {
                this.onFormStartFn = fn;
            };

            private setOnBeforeSubmitFn = (
                fn: (values: FieldValues) => void | Promise<void>
            ): void => {
                this.onBeforeSubmitFn = fn;
            };

            /* --- value gathering ---------------------------------------- */

            private getValues = (): FieldValues => {
                const out: FieldValues = { ...initialValues };
                const formEl = this.formRef.current;
                if (!formEl) return out;
                const elements = formEl.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
                    'input[name], textarea[name], select[name]'
                );
                elements.forEach((el) => { if (el.name) out[el.name] = el.value; });
                return out;
            };

            private setErrors = (errors: FieldErrors): void => {
                this.setState({ errors });
            };

            /* --- binders ------------------------------------------------ */

            private handleInputChange = (): void => {
                if (!this.formStarted) {
                    this.formStarted = true;
                    if (this.onFormStartFn) this.onFormStartFn();
                }
            };

            private bindInput = (name: string): InputBindings => ({
                name,
                defaultValue: initialValues[name] ?? '',
                onChange: this.handleInputChange,
            });

            private bindForm = (): FormBindings => ({
                ref: this.formRef,
                onSubmit: this.handleFormSubmit,
            });

            private handleFormSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
                e.preventDefault();
                const values = this.getValues();
                const { onSubmit } = this.props;
                Promise.resolve(this.onBeforeSubmitFn ? this.onBeforeSubmitFn(values) : undefined)
                    .then(() => (onSubmit ? onSubmit(values) : undefined))
                    .catch(() => { /* consumer owns errors */ });
            };

            private submitForm = (): void => {
                const values = this.getValues();
                const { onSubmit } = this.props;
                Promise.resolve(this.onBeforeSubmitFn ? this.onBeforeSubmitFn(values) : undefined)
                    .then(() => (onSubmit ? onSubmit(values) : undefined))
                    .catch(() => { /* consumer owns errors */ });
            };

            render() {
                const formApi: FormApi = {
                    bindForm: this.bindForm,
                    bindInput: this.bindInput,
                    submitForm: this.submitForm,
                    setOnFormStartFn: this.setOnFormStartFn,
                    setOnBeforeSubmitFn: this.setOnBeforeSubmitFn,
                    getValues: this.getValues,
                    errors: this.state.errors,
                    setErrors: this.setErrors,
                    values: initialValues,
                };

                // Strip HOC-only props before forwarding to the wrapped component.
                const { dispatch: _d, form: _f, onSubmit: _s, ...rest } = this.props as IncomingProps;
                void _d; void _f; void _s;

                return React.createElement(
                    Component as React.ComponentType<WithFormProps & Omit<P, keyof WithFormProps>>,
                    Object.assign({}, rest, { form: formApi }) as never
                );
            }
        }

        // Connect to redux so the HOC has `dispatch` and the `form` slice.
        // Consumers of the wrapped component pass only their own props; redux
        // injects the rest. The cast through `any` is intentional — react-redux's
        // generic inference can't reconcile the HOC's `IncomingProps` shape.
        const Connected = (connect(
            (state: { form?: FieldValues }) => ({ form: state.form })
        ) as unknown as (c: React.ComponentType<IncomingProps>) => React.ComponentType<Omit<IncomingProps, keyof InjectedProps> & { onSubmit?: (values: FieldValues) => void | Promise<void> }>)(WithForm);

        return Connected as unknown as React.ComponentType<
            Omit<P, keyof WithFormProps> & { onSubmit?: (values: FieldValues) => void | Promise<void> }
        >;
    };
}

export default withForm;