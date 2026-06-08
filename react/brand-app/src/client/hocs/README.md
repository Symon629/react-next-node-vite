# Form HOCs

Two cooperating, class-based HOCs that turn an ordinary React component
into a redux-connected form host. They're meant to be composed with redux's
`compose()` helper so the wrapped component receives a single `form` prop
plus an optional `validateAndSubmit` helper.

```
compose(
    connect(mapStateToProps),       // brand strings / config from redux
    withForm({ initialValues }),    // form lifecycle + ref + binders
    withValidation({ rules }),      // synchronous validation pipeline
)(MyForm)
```

---

## `withForm({ initialValues })`

Source: [`withForm.tsx`](./withForm.tsx)

A redux-connected HOC that owns the `<form>` ref and the form's lifecycle.
The wrapped component renders the actual markup and uses three "binders"
exposed on `this.props.form`:

| API                 | Returns / signature                                 | Use as                                  |
| ------------------- | --------------------------------------------------- | --------------------------------------- |
| `bindForm()`        | `{ ref, onSubmit }`                                 | `<form {...form.bindForm()}>`           |
| `bindInput(name)`   | `{ name, defaultValue, onChange }`                  | `<input {...form.bindInput('email')}>` |
| `submitForm()`      | `void` — imperative submit                          | `this.props.form.submitForm()`          |
| `getValues()`       | `Record<string,string>` snapshot from the live DOM  | inside `onValidSubmit`                  |
| `setErrors(errors)` | imperatively replace the error map                  | from a remote-validation callback       |
| `errors`            | `Record<string,string \| undefined>`                | for inline `<small>` messages           |
| `values`            | the original `initialValues` (read-only)            | only useful as a fallback               |

### Lifecycle hooks (registered by the wrapped component)

| Setter                    | Fires when                       | Receives          |
| ------------------------- | -------------------------------- | ----------------- |
| `setOnFormStartFn(fn)`    | first `onChange` on any input    | `()`              |
| `setOnBeforeSubmitFn(fn)` | before `props.onSubmit` runs     | `(values)`        |

`withValidation` registers itself as the before-submit hook automatically
(see below). Consumers can also register their own — useful for analytics
("user started filling the form") or last-mile sanitisation.

### What runs on mount

`componentDidMount` does four things, in order:

1. Reads the live `<form>` DOM via the instance ref.
2. Walks every `input[name] | textarea[name] | select[name]` to discover
   the registered field names.
3. `dispatch({ type: FORM_UNVALIDATE.MERGE_INTO_FORM, model })` — the model
   is `pick(props.form, fieldNames)`, so the redux `form` slice is seeded
   with whatever the parent already had for these fields.
4. `scrollUp()` — `window.scrollTo({ top: 0 })`.

### Why uncontrolled inputs?

`bindInput` returns `defaultValue` (not `value`). The input is **uncontrolled** —
typing never round-trips through React state, so the form host never re-renders
on keystrokes. State changes only happen on submit (or when validation surfaces
errors). For a 50-field form this is a meaningful win.

The trade-off: you can't programmatically push a value into a single input
without a manual ref. If you need that, fall back to a controlled component
for that one field — the rest of the API still works.

### Submit flow

```
<form {...form.bindForm()}>          // HOC receives the submit event
   │
   ├── e.preventDefault()
   ├── values = getValues()           // walk the form DOM
   ├── await onBeforeSubmitFn(values) // validation / async checks
   └── await props.onSubmit(values)   // your handler
```

If `onBeforeSubmitFn` rejects (e.g. validation fails) the chain stops and
`props.onSubmit` is never called.

### Minimal usage

```tsx
class LoginFormImpl extends React.Component<WithFormProps> {
    private onSubmit = (values: Record<string,string>) => {
        // POST values...
    };

    render() {
        const { form } = this.props;
        return (
            <form {...form.bindForm()} noValidate>
                <input {...form.bindInput('email')}    type="email" />
                <input {...form.bindInput('password')} type="password" />
                {form.errors.email && <small>{form.errors.email}</small>}
                <button type="submit">Submit</button>
            </form>
        );
    }
}

export default withForm({ initialValues: { email: '', password: '' } })(LoginFormImpl);
```

---

## `withValidation({ rules })`

Source: [`withValidation.tsx`](./withValidation.tsx)

Layered **above** `withForm` (so it appears later in the `compose()` call —
remember `compose` is right-to-left). It does three things:

1. Defines a small set of synchronous rule helpers — `required(label)`,
   `email()`, `minLength(n)`. Each is a `(value, allValues) => string | undefined`.
2. Exposes a `validateAndSubmit(onValidSubmit)` prop. Calling it:
   - Wraps `onValidSubmit` with a validator pipeline.
   - Registers the wrapped function as `withForm`'s `onBeforeSubmitFn` —
     so the existing `<form {...form.bindForm()}>` flow runs validation
     automatically; nothing else needs to change in the markup.
3. Pushes errors into `form.errors` via `form.setErrors`, which causes a
   single re-render with inline error messages.

### Built-in rules

```ts
required('Email')                       // empty value → "Email is required"
email()                                 // bad regex   → "Invalid email"
minLength(8)                            // < 8 chars   → "Must be at least 8 characters"
```

Custom rules are just functions:

```ts
const matchesPolicy = (n: number): ValidatorFn =>
    (v) => /[A-Z]/.test(v) && v.length >= n ? undefined : 'Use 1 capital and ' + n + '+ chars';
```

### Where the validation actually runs

```
form.bindForm().onSubmit(e)
   │
   ├── e.preventDefault()
   ├── values = getValues()
   ├── onBeforeSubmitFn = validation handler ← registered by validateAndSubmit
   │      └── runRules(values)
   │            ├── all good →    form.setErrors({})  → onValidSubmit(values)
   │            └── one or more → form.setErrors(...) → throw → submit aborted
   └── props.onSubmit(values)         (only reached if validation passed)
```

### Minimal usage

```tsx
class LoginFormImpl extends React.Component<WithValidationProps> {
    componentDidMount() {
        // Register the validator with the form. Done once.
        this.props.validateAndSubmit(this.onValidSubmit);
    }
    private onValidSubmit = (values: Record<string,string>) => { /* ... */ };
    render() {
        const { form } = this.props;
        return (
            <form {...form.bindForm()} noValidate>
                <input {...form.bindInput('email')}    type="email" />
                <input {...form.bindInput('password')} type="password" />
                {form.errors.password && <small>{form.errors.password}</small>}
                <button type="submit">Submit</button>
            </form>
        );
    }
}

export default compose(
    withForm({ initialValues: { email: '', password: '' } }),
    withValidation({
        email:    [required('Email'), email()],
        password: [required('Password'), minLength(8)],
    }),
)(LoginFormImpl);
```

---

## FAQ

**Why class components?** The form's lifecycle (mount-time dispatch, ref
ownership, callback registration) is naturally expressed with class methods
and instance fields. Everything here is portable to hooks (`useRef` +
`useEffect`) but the class form is what the wider codebase uses.

**Why redux?** `withForm` connects so it can dispatch the
`FORM_UNVALIDATE.MERGE_INTO_FORM` action on mount. If your store doesn't
have a `form` reducer yet, the action is dispatched but no slice will react
to it — that's fine; the HOC still works.

**Can I skip `withValidation`?** Yes. Drop it from the `compose()` chain
and pass an `onSubmit` prop instead. `bindForm()`'s submit handler calls
`props.onSubmit` directly when no before-submit hook is registered.
