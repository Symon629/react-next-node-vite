import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { mount } from "enzyme";
import CommentBox from "../CommentBox";
import Root from "../../../Root";

// ── Alternative "hack" approach (kept for reference, not used below) ──
//
// Instead of wrapping the component in <Root> (which provides a real
// Redux store via <Provider>), you can bypass Redux entirely in tests
// by:
//   1. Importing the UNCONNECTED named export: `import { CommentBox }`
//      (the raw class, before `connect()` wraps it).
//   2. Passing a stub for any prop that connect() would normally inject,
//      e.g. `<CommentBox saveComment={saveComment} />`.
//
// How it works: `connect(null, actions)(CommentBox)` returns a wrapper
// that reads the store from context and pushes action creators in as
// props. The bare class doesn't care where its props come from — give
// it `saveComment` directly and `this.props.saveComment(...)` resolves
// to this no-op, so `handleSubmit` won't throw
// "saveComment is not a function".
//
// Trade-off: it's quicker and avoids needing a Provider, but you're
// testing a component in a shape it never has in production. The
// Root-wrapped tests below exercise the real connected component.
const saveComment = () => { };

it("renders without crashing", () => {
    render(<Root><CommentBox /></Root>);
    // getByText is a query method provided by React Testing Library that allows you to select elements based on their text content.    
    expect(screen.getByText("Comment")).toBeInTheDocument();
});

it("contains a textarea and a button", () => {
    render(<Root><CommentBox /></Root>);
    // getByRole is a query method provided by React Testing Library that allows you to select elements based on their ARIA role. 
    // ARIA roles are attributes that define the purpose of an element in terms of accessibility.
    //  For example, a textarea has the role of "textbox" and a button has the role of "button".
    // In this case, we are using it to select the textarea and button elements in the CommentBox component.
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
});

// Doing the same thing as above but by using Enzyme instead of React Testing Library

let wrapper;
beforeEach(() => {
    // jsdom's `document` is shared across all tests in the file, so we
    // reset it to a clean state before each test runs. This prevents
    // tests from affecting each other and ensures a consistent starting
    // point for every test.
    document.body.innerHTML = '';
    wrapper = mount(<Root><CommentBox /></Root>);
});
it("renders without crashing", () => {
    mount(<Root><CommentBox /></Root>);
});

it("contains a textarea and a button", () => {
    // The `find` method searches the rendered output for all instances of the
    // specified element (e.g. "textarea") and returns an array of matches.
    // We expect to find exactly one textarea and one button in the CommentBox's output.
    expect(wrapper.find("textarea").length).toEqual(1);
    expect(wrapper.find("button").length).toEqual(1);
});

// afterEach is a function provided by Jest that allows you to run a piece of code after each test in a test suite.
afterEach(() => {
    // jsdom's `document` is shared across all tests in the file, so we
    // reset it to a clean state after each test runs. This prevents
    // tests from affecting each other and ensures a consistent starting
    // point for every test.
    document.body.innerHTML = '';
    // Enzyme's `shallow` rendering API returns a wrapper object that represents the rendered component. The `unmount` method on this wrapper simulates unmounting the component from the DOM, which can trigger cleanup effects and ensure that tests don't interfere with each other.
    // unmounting the component after each test ensures that any side effects or state changes from one test don't affect subsequent tests, leading to more reliable and isolated test cases.
    wrapper.unmount();
});

// Simulating user interactions and testing component behavior is a crucial aspect of testing React components.
// Using React Testing Library, we can simulate user interactions such as typing in the textarea and submitting the form to ensure that the component behaves as expected.

it("updates the textarea value when user types (RTL)", () => {
    // We need to render the component first — earlier RTL tests rendered
    // their own copies and were torn down by `afterEach`/`document.body`
    // resets, so the DOM is empty at the start of this test.
    render(<Root><CommentBox /></Root>);

    // Grab the textarea by its ARIA role ("textbox" covers <textarea>).
    const textarea = screen.getByRole("textbox");

    // ❌ Why the old approach failed:
    //    textarea.value = "New comment";
    //    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    // React installs a getter/setter on the input's `value` prop and
    // tracks the last value it saw. Direct assignment bypasses that
    // tracker, so when the native `change` event fires React thinks
    // "value didn't change" and skips the synthetic onChange handler.
    // The component's state never updates.
    //
    // ✅ `fireEvent.change` uses React's value tracker correctly:
    // it sets the value via the prototype setter and dispatches an
    // `input` event (which is what React actually listens for under
    // the hood for controlled inputs), so onChange fires and state
    // updates as it would from a real keystroke.
    fireEvent.change(textarea, { target: { value: "New comment" } });

    // The textarea is controlled by `state.comment`, so if the state
    // updated, the rendered value reflects the new text.
    expect(textarea.value).toEqual("New comment");
});

// Using Enzyme, we can also simulate user interactions in a similar way.
// Simulating user interactions and testing component behavior is a crucial aspect of testing React components. 
// In the CommentBox component, we can simulate user interactions such as typing in the textarea and submitting the form to ensure that the component behaves as expected.

it("updates the textarea value when user types", () => {
    // Simulate a change event on the textarea element with a new value.
    wrapper.find("textarea").simulate("change", { target: { value: "New comment" } });
    // wrapper.update() is used to force the component to re-render and update its state after simulating the change event. This is necessary because Enzyme's simulate method does not automatically trigger a re-render of the component, so we need to call update() to ensure that the component's state and rendered output reflect the changes made by the simulated event.
    wrapper.update();
    // After simulating the change event, we expect the component's state to update and the textarea's value to reflect the new comment.
    expect(wrapper.find("textarea").prop("value")).toEqual("New comment");
});

// ── Note on `wrapper.update()` vs React Testing Library ──────────
//
// Enzyme caches the rendered output inside the wrapper object.
// When state changes (e.g. after `simulate("change", ...)`), the
// underlying React tree updates but the wrapper's cached snapshot
// does not. `wrapper.update()` tells Enzyme: "re-read the rendered
// output from React so my next .find()/.prop() reflects reality."
//
// React Testing Library has NO equivalent and needs none, because
// its queries (`screen.getByRole`, `container.querySelector`, etc.)
// always read directly from the live jsdom DOM. There is no cache
// to invalidate — every call returns the current node.
//
// Mapping by intent:
//
//   Enzyme                                   →  RTL
//   ──────────────────────────────────────────────────────────────
//   wrapper.update();                        →  (nothing — just
//   wrapper.find('textarea').prop('value')      re-query the DOM:
//                                               screen.getByRole(
//                                                 'textbox').value)
//
//   wrapper.update() after async work        →  await screen.findByX(...)
//                                               or
//                                               await waitFor(() => ...)
//
//   force a re-render with new props         →  const { rerender } =
//                                                 render(<C a={1} />);
//                                               rerender(<C a={2} />);
//
// In short: in RTL you don't sync the test's view of the DOM with
// React — RTL is always looking at the real DOM, so a fresh query
// after the event is all you need, as in the RTL test above:
//
//   fireEvent.change(textarea, { target: { value: "New comment" } });
//   expect(textarea.value).toEqual("New comment"); // already current

// When form is submitted, the textarea should be cleared. We can test this behavior as well.

it("clears the textarea when form is submitted", () => {
    render(<Root><CommentBox /></Root>);
    const textarea = screen.getByRole("textbox");
    const button = screen.getByRole("button");

    // Simulate typing in the textarea
    fireEvent.change(textarea, { target: { value: "New comment" } });
    expect(textarea.value).toEqual("New comment");

    // Simulate form submission by clicking the button
    fireEvent.click(button);

    // After submission, the textarea should be cleared
    expect(textarea.value).toEqual("");
});

// Using Enzyme, we can also simulate form submission and test that the textarea is cleared after submission.

it("clears the textarea when form is submitted (Enzyme)", () => {
    // Type into the textarea by firing a synthetic change event.
    wrapper.find("textarea").simulate("change", { target: { value: "New comment" } });
    // Refresh Enzyme's cached snapshot so the next .find()/.prop()
    // reflects the post-setState render.
    wrapper.update();
    expect(wrapper.find("textarea").prop("value")).toEqual("New comment");

    // ❌ Why `wrapper.find("button").simulate("submit")` does NOT work:
    //    `simulate(eventName)` invokes the React prop named `on<EventName>`
    //    on the matched element. The <button> has no `onSubmit` prop, so
    //    nothing happens. Unlike a real browser, Enzyme's simulate does
    //    not bubble events up to the parent <form>.
    //
    // ✅ Simulate "submit" directly on the <form>, which is where the
    //    `onSubmit={this.handleSubmit.bind(this)}` handler lives.
    //    We pass a fake event object with a no-op `preventDefault`
    //    because the real handler calls `event.preventDefault()` and
    //    Enzyme passes our object straight through as the event.
    wrapper.find("form").simulate("submit", { preventDefault() { } });
    wrapper.update();

    // After submission, handleSubmit calls setState({ comment: '' }),
    // so the controlled textarea's value prop is now an empty string.
    expect(wrapper.find("textarea").prop("value")).toEqual("");
});

describe("CommentBox", () => {
    beforeEach(() => {
        wrapper.find("textarea").simulate("change", { target: { value: "New comment" } });
        wrapper.update();

    });
    // ... all the tests above go here ...
    it("updates the textarea value when user types (enzyme)", () => {

        expect(wrapper.find("textarea").prop("value")).toEqual("New comment");
    })
    it("clears the textarea when form is submitted (Enzyme)", () => {
        expect(wrapper.find("textarea").prop("value")).toEqual("New comment");
        wrapper.find("form").simulate("submit", { preventDefault() { } });
        wrapper.update();
        expect(wrapper.find("textarea").prop("value")).toEqual("");
    })
})  