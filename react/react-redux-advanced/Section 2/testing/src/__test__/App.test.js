import React from 'react';
// `createRoot` is the React 18+ API for rendering a React tree into a DOM node.
// It replaces the legacy `ReactDOM.render` from React 17.
import { createRoot } from 'react-dom/client';
// `act` tells React "treat everything inside this callback as a single update,
// then flush all effects/state changes synchronously before returning".
// Without it, `root.render(...)` schedules work asynchronously and the DOM
// may still be empty when our `expect(...)` runs on the next line.
import { act } from 'react';

// We will use Enzyme's shallow rendering API to test the App component in isolation,
// without rendering its child components (CommentBox and CommentList).
import shallow from 'enzyme/shallow';
// RTL imports for the jest + react-testing-library variants below.
import { render, screen } from '@testing-library/react';
import App from "../App"
import Root from "../Root";

import CommentBox from "../components/CommentBox/CommentBox";
import CommentList from "../components/CommentList/CommentList";

// it('renders without crashing', () => {
//     // 1. Create an in-memory DOM node to act as the mount point.
//     //    It is detached from `document`, which is fine — jsdom still
//     //    treats it as a real Element we can inspect.
//     const div = document.createElement('div');

//     // 2. Create a React root bound to that div. The root owns the
//     //    reconciler state and lets us call `render` / `unmount`.
//     const root = createRoot(div);

//     // 3. Render <App /> inside `act` so React commits to the DOM
//     //    before we assert. After this block, `div.innerHTML` reflects
//     //    the fully rendered output.
//     act(() => {
//         root.render(<App />);
//     });

//     // 4. Assert the rendered HTML contains text that the CommentBox
//     //    component actually outputs. Note: the component NAME
//     //    "CommentBox" never appears in the DOM — only the tags/text
//     //    it renders do (e.g. the <h4>Comment</h4> heading).
//     // to contain here is the matchers

//     expect(div.innerHTML).toContain("Comment");

//     // 5. Tear down the React tree. Wrapped in `act` so unmount
//     //    effects (cleanup functions) flush before the test ends.
//     act(() => root.unmount());
// });

let wrapper;
beforeEach(() => {
    // jsdom's `document` is shared across all tests in the file, so we
    // reset it to a clean state before each test runs. This prevents
    // tests from affecting each other and ensures a consistent starting
    // point for every test.
    document.body.innerHTML = '';
    // Shallow-render <App /> directly. `shallow` does NOT recursively
    // render children, so wrapping App in <Root> would just give us
    // back the Provider and we'd never see App's children. Shallow
    // rendering also means we don't need a redux <Provider> here —
    // CommentBox/CommentList are returned as un-rendered placeholders.
    wrapper = shallow(<App />);
});


it("renders without crashing", () => {
    // Shallow rendering is a technique in Enzyme that allows us to render a component
    // without rendering its child components. This is useful for unit testing a component
    // in isolation, without worrying about the behavior of its children.
    shallow(<App />);
});

it("contains a CommentBox component", () => {
    // The `find` method searches the rendered output for all instances of the
    // specified component (CommentBox) and returns an array of matches.
    // We expect to find exactly one instance of CommentBox in the App's output.
    expect(wrapper.find(CommentBox).length).toEqual(1);
});

it("contains a CommentList component", () => {
    // Similar to the previous test, we check for the presence of CommentList
    // in the App's rendered output. We expect to find exactly one instance.
    // We pass the imported component reference instead of the string
    // "CommentList" because the default export is wrapped in connect(),
    // giving it displayName "Connect(CommentList)". Reference matching
    // sidesteps that.
    expect(wrapper.find(CommentList).length).toEqual(1);
});


// ─────────────────────────────────────────────────────────────────────
// Same assertions, written with Jest + React Testing Library.
//
// Key difference from Enzyme: RTL deliberately has no API to query by
// React component name/class. You assert against what the user actually
// sees in the DOM. So instead of `find(CommentBox)`, we look for the
// markup CommentBox renders (a "Comment" heading, a textarea, a submit
// button), and for CommentList we look for the <ul> it renders.
// ─────────────────────────────────────────────────────────────────────

describe('App (jest + react-testing-library)', () => {
    // Helper: every test renders <App /> wrapped in <Root> so the
    // connected CommentBox/CommentList have a redux store available.
    const renderApp = () =>
        render(
            <Root>
                <App />
            </Root>
        );

    it('renders without crashing', () => {
        // If render() throws, the test fails automatically — no explicit
        // assertion needed. We still call it to make intent obvious.
        expect(() => renderApp()).not.toThrow();
    });

    it('contains a CommentBox component', () => {
        renderApp();

        // CommentBox renders an <h4>Comment</h4> heading. Querying by
        // role 'heading' with a name regex is the RTL-idiomatic way to
        // assert that heading exists.
        expect(
            screen.getByRole('heading', { name: /comment/i })
        ).toBeInTheDocument();

        // It also renders a <textarea> and a submit button — both are
        // strong signals that CommentBox mounted.
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /submit comment/i })
        ).toBeInTheDocument();
    });

    it('contains a CommentList component', () => {
        const { container } = renderApp();

        // CommentList renders a <ul>. With no comments seeded into redux
        // it has zero <li> children, so role queries for 'list' / 'listitem'
        // are unreliable here; a direct DOM check is clearer.
        expect(container.querySelector('ul')).toBeInTheDocument();
    });
});


