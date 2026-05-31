# React Class Components: `bind`, `state`, and `setState`

A quick reference for the patterns used in `CommentBox.js`.

---

## 0. The core rule about `this`

It's not that methods "have their own `this`." The real rule is:

> In JavaScript, `this` is not determined by where a function is **defined**. It's determined by how the function is **called**.

### A concrete example (plain JS, no React)

```js
class Dog {
  constructor(name) {
    this.name = name;
  }

  bark() {
    // `this.name` only works if `this` points to a Dog instance.
    console.log(this.name + ' says woof');
  }
}

const rex = new Dog('Rex');

// ── Call #1: as a method ──
rex.bark();
// 👉 prints "Rex says woof"
// Because of the dot: `rex.bark()` means "call bark with `this` = rex".

// ── Call #2: as a plain function ──
const f = rex.bark;   // f is the SAME function as rex.bark — yes, still a function!
f();
// 👉 TypeError: Cannot read properties of undefined (reading 'name')
// We called f() with no dot, no owner. `this` is `undefined`,
// so `this.name` blows up.

// ── Call #3: detached, but bound first ──
const g = rex.bark.bind(rex);  // returns a NEW function with `this` permanently = rex
g();
// 👉 prints "Rex says woof"
// Even though we called g() with no dot, `bind(rex)` already locked
// `this` to rex, so it doesn't matter how g is called from now on.
```

`f` is absolutely a function — it's literally the same function object as `rex.bark`. The only thing that changed is **how we called it**:

| Call            | Has a `.` before it? | What `this` becomes  |
| --------------- | -------------------- | -------------------- |
| `rex.bark()`    | yes (`rex.`)         | `rex`                |
| `f()`           | no                   | `undefined` 💥       |
| `g()` (bound)   | no                   | `rex` (locked by `bind`) ✅ |

Same underlying function. Three different call sites. `bind` is the escape hatch: it produces a new function whose `this` is **frozen**, so you can pass it around freely without losing the instance.

### Why this matters for React

When you write:

```jsx
<button onClick={this.handleClick}>Click</button>
```

You're doing the equivalent of `const f = rex.bark` — you hand React a bare reference to the function, **without the dot**. Later, when the button is clicked, React calls it like `f(event)` internally. No dot, no owner → `this` is `undefined` → `this.setState(...)` crashes.

`bind`, arrow functions, and class fields all exist to solve the same problem: **lock `this` to the component instance so it survives being passed around as a plain reference.**

---

## 1. `Function.prototype.bind`

### What it is
`bind` is a **plain JavaScript** method (not React-specific) that lives on every function. It returns a **new function** whose `this` value is permanently set to whatever you pass in.

```js
const fn = someFunction.bind(thisArg, arg1, arg2);
```

- It does **not** call the function — it returns a new one.
- The bound `this` cannot be overridden later (even with `.call` or `.apply`).

### Why React class components need it

In a class, regular methods are **not** automatically bound to the instance:

```js
class Foo {
  constructor() { this.name = 'Foo'; }
  greet() { console.log(this.name); }
}

const f = new Foo();
f.greet();           // "Foo"          ✅ called as a method
const g = f.greet;
g();                 // undefined / TypeError ❌ `this` is lost
```

When you write `<button onClick={this.handleClick}>`, React stores that function reference and later calls it as a plain function — so `this` becomes `undefined` unless you bind.

### A concrete example

```js
class Counter extends React.Component {
  state = { n: 0 };

  increment() {
    this.setState({ n: this.state.n + 1 });
  }

  render() {
    return (
      <>
        {/* ❌ BROKEN: `this` will be undefined when React calls it */}
        <button onClick={this.increment}>broken</button>

        {/* ✅ FIX 1: bind in render (creates a new fn every render) */}
        <button onClick={this.increment.bind(this)}>bind in render</button>

        {/* ✅ FIX 2: arrow wrapper in render (also creates a new fn) */}
        <button onClick={(e) => this.increment(e)}>arrow in render</button>
      </>
    );
  }
}
```

### Where to bind — best to worst

| Approach | Where | Pros | Cons |
|---|---|---|---|
| Class field arrow `inc = () => {...}` | class body | auto-bound, clean | needs Babel class-properties (CRA has it) |
| `this.inc = this.inc.bind(this)` | constructor | bound once | boilerplate |
| `onClick={this.inc.bind(this)}` | render | works | new function every render → can break `PureComponent` / `React.memo` children |
| `onClick={() => this.inc()}` | render | works, can pass args | same perf caveat |

**Recommended:** class field arrow function.

```js
class CommentBox extends React.Component {
  state = { comment: '' };

  handleChange = (e) => this.setState({ comment: e.target.value });
  handleSubmit = (e) => { e.preventDefault(); console.log(this.state.comment); };

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <textarea value={this.state.comment} onChange={this.handleChange} />
        <button type="submit">Submit</button>
      </form>
    );
  }
}
```

### Bonus: pre-filling arguments
`bind` can also pre-fill leading arguments (a.k.a. partial application):

```js
function greet(greeting, name) { return `${greeting}, ${name}`; }
const hi = greet.bind(null, 'Hi');
hi('Sam'); // "Hi, Sam"
```

In React this is handy for list rows:

```js
{items.map(item => (
  <li key={item.id} onClick={this.handleClick.bind(this, item.id)}>
    {item.label}
  </li>
))}
```

---

## 2. `state`

### What it is
`state` is a plain object on a class component instance that stores **data the component owns and may change over time**. Changing it triggers a re-render.

### Initializing
Either in the constructor:

```js
constructor(props) {
  super(props);
  this.state = { comment: '', loading: false, items: [] };
}
```

…or as a class field:

```js
state = { comment: '', loading: false, items: [] };
```

### Reading
Just read it like any object: `this.state.comment`.

### Do / Don't

✅ **Do** keep state minimal — only what the UI actually depends on.
✅ **Do** treat state as **immutable** — always produce new objects/arrays.
❌ **Don't** mutate state directly:

```js
// ❌ React won't see this and won't re-render
this.state.comment = 'hi';
this.state.items.push(newItem);

// ✅ create new values and call setState
this.setState({ comment: 'hi' });
this.setState({ items: [...this.state.items, newItem] });
```

❌ **Don't** put derived/computed values in state if you can compute them from props or other state during render.

---

## 3. `setState`

### What it is
The **only** correct way to update state. It schedules an update and a re-render.

### Two forms

**Object form** — when the new value doesn't depend on the previous state:

```js
this.setState({ comment: event.target.value });
```

**Updater function form** — when the new value depends on the previous state. This is safer because `setState` is **asynchronous and batched**:

```js
this.setState((prevState, props) => ({
  count: prevState.count + 1,
}));
```

### Why the function form matters

```js
// ❌ Looks like it increments by 3, but actually increments by 1.
// All three reads see the same stale this.state.count.
this.setState({ count: this.state.count + 1 });
this.setState({ count: this.state.count + 1 });
this.setState({ count: this.state.count + 1 });

// ✅ Correctly increments by 3 — each updater receives the latest state.
this.setState(s => ({ count: s.count + 1 }));
this.setState(s => ({ count: s.count + 1 }));
this.setState(s => ({ count: s.count + 1 }));
```

### It's a merge, not a replace
`setState({ a: 1 })` only updates `a`; other top-level keys are preserved.
But the merge is **shallow** — nested objects are replaced, not deep-merged:

```js
// state: { user: { name: 'A', age: 1 } }
this.setState({ user: { age: 2 } });
// result: { user: { age: 2 } }  ← name is GONE

// ✅ spread the previous nested object yourself
this.setState(s => ({ user: { ...s.user, age: 2 } }));
```

### It's asynchronous
Don't read `this.state` immediately after calling `setState` and expect the new value:

```js
this.setState({ comment: 'hi' });
console.log(this.state.comment); // ❌ may still be the OLD value
```

If you need to react to the update, use the second-argument callback or `componentDidUpdate`:

```js
this.setState({ comment: 'hi' }, () => {
  console.log(this.state.comment); // ✅ definitely 'hi'
});
```

### Don't call `setState` in places that re-trigger renders forever

```js
render() {
  this.setState({ x: 1 }); // ❌ infinite loop
  return <div />;
}

componentDidUpdate() {
  this.setState({ x: 1 }); // ❌ infinite loop unless guarded by a condition
}
```

✅ Safe places: event handlers, `componentDidMount`, timers, async callbacks, and `componentDidUpdate` **with a condition** (`if (prevProps.id !== this.props.id) ...`).

### Do / Don't summary

| ✅ Do | ❌ Don't |
|---|---|
| Use `setState` for every update | Mutate `this.state` directly |
| Use the updater function when new state depends on old | Chain object-form `setState` calls that read `this.state` |
| Spread nested objects/arrays to keep other fields | Assume merge is deep |
| Use the callback or `componentDidUpdate` to act on the new state | Read `this.state` right after `setState` |
| Keep state minimal | Duplicate props into state |

---

## TL;DR

- `bind(this)` returns a new function with `this` locked to the component, so handlers passed to JSX still know which component they belong to. Prefer **class-field arrow functions** to avoid binding entirely.
- `state` is the component's mutable data — initialize it, **never mutate it**.
- `setState` is the only way to change state, it's **async**, **shallow-merged**, and accepts an **updater function** for state-dependent updates.

