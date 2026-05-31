import React from 'react';
import { mount } from 'enzyme';
import Root from '../Root';
import App from '../App';
import moxios from 'moxios';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// we will attemp to render the entire app, including the child components, to make sure the fetchComments action creator is working and that the comments are being rendered in the CommentList component. This is an integration test because we are testing how different parts of our application work together.
// find the fetchComments and click it.
// Expect to find a list of comments in the CommentList component.

describe('App (enzyme)', () => {
    let wrapper;

    beforeEach(() => {
        // This is to set up moxios before each test. Moxios is a library that allows us to mock axios requests in our tests. By calling `moxios.install()`, we are telling moxios to intercept any axios requests made during the test and allow us to control the responses. This is important for our integration test because we want to simulate the behavior of fetching comments from an API without actually making real network requests.
        moxios.install();
        moxios.stubRequest("https://jsonplaceholder.typicode.com/comments", {
            status: 200,
            response: [
                { name: "Fetched #1" },
                { name: "Fetched #2" },
                { name: "Fetched #3" },
                { name: "Fetched #4" },
                { name: "Fetched #5" },
                // We can add more comments here to simulate a larger response from the API. This will allow us to test how our application handles a larger list of comments and ensures that the fetchComments action creator is working correctly.
            ]
        });
        // We use `mount` instead of `shallow` because we want to render the entire component tree, including the child components. This is necessary for our integration test, as we want to test how the fetchComments action creator works and how the comments are rendered in the CommentList component.
        // We wrap <App /> in <Root> so that the connected CommentBox/CommentList have a redux store available to them.
        wrapper = mount(
            <Root>
                <App />
            </Root>
        );
    });

    afterEach(() => {
        // moxios.uninstall() is called to clean up moxios after each test. This ensures that moxios does not interfere with any other tests that may be running after this one. It also helps to prevent memory leaks and ensures that each test starts with a clean slate.
        moxios.uninstall();

        // Unmounting the component after each test ensures that we clean up any side effects and that each test starts with a fresh instance of the component. This is especially important when using `mount`, as it renders the full DOM and can lead to memory leaks if not properly cleaned up.
        wrapper.unmount();
    });

    // `done` MUST be declared as a parameter — Jest only injects it when
    // the test function asks for it. Without it, calling done() throws
    // ReferenceError and the test fails.
    it("can fetch a list of comments and display them", (done) => {
        // find the button and click it. This triggers the fetchComments
        // action creator, which makes an axios GET request (intercepted
        // by moxios) and updates the redux store with the fetched comments.
        wrapper.find(".fetch-comments").simulate("click");
        // moxios.wait runs its callback once any pending axios request
        // has been resolved by the stub — that's the right moment to
        // re-read the rendered DOM.
        moxios.wait(() => {
            // After redux-promise resolves and the store updates, enzyme's
            // cached render is stale; wrapper.update() forces it to
            // re-render before we query the DOM.
            wrapper.update();
            expect(wrapper.find("li").length).toEqual(5);
            done();
        });
    })

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

    // Mirror the moxios setup used in the enzyme block so the
    // "fetch comments" test has a stubbed network response.
    beforeEach(() => {
        moxios.install();
        moxios.stubRequest('https://jsonplaceholder.typicode.com/comments', {
            status: 200,
            response: [
                { name: 'Fetched #1' },
                { name: 'Fetched #2' },
                { name: 'Fetched #3' },
                { name: 'Fetched #4' },
                { name: 'Fetched #5' },
            ],
        });
    });

    afterEach(() => {
        moxios.uninstall();
    });

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
    });

    /*
     * ─────────────────────────────────────────────────────────────────
     * Fetch comments — RTL equivalent of the enzyme test above.
     *
     * Why this test is async:
     *   Clicking "Fetch Comments" dispatches an action whose payload is
     *   a Promise (redux-promise resolves it before the reducer runs).
     *   That means the <li> elements do NOT exist on the same tick as
     *   the click — they appear only AFTER:
     *     1. moxios resolves the stubbed request,
     *     2. redux-promise unwraps the payload and dispatches,
     *     3. react-redux notifies <CommentList>,
     *     4. React commits the re-render.
     *
     *   If we asserted synchronously (like `expect(...).toBe(5)` right
     *   after fireEvent.click), we'd be looking at the DOM BEFORE step
     *   4 and the test would fail with "expected 5, received 0".
     *
     * What `waitFor` does:
     *   `waitFor(callback)` polls the callback on a short interval
     *   (default ~50ms) until it either:
     *     • passes (no thrown error / no rejected promise) → resolves, or
     *     • times out (default 1000ms) → rejects and fails the test.
     *   Every failed attempt is swallowed; only the final attempt's
     *   error is surfaced. This makes it the right tool for "the DOM
     *   will eventually look like X" assertions.
     *
     * When to use `waitFor` vs alternatives:
     *   • `waitFor`            → assert that something becomes true
     *                            (element count, attribute, text change,
     *                            a mock having been called).
     *   • `findBy*` queries    → wait for ONE element to appear; prefer
     *                            these over `waitFor(() => getBy*)` —
     *                            they're shorter and have better errors.
     *   • `waitForElementToBeRemoved` → wait for something to disappear.
     *   • `getBy*` / `queryBy*`→ synchronous; use only when the element
     *                            is already there (or definitely absent).
     *
     * Pitfalls:
     *   • Don't put side-effects (clicks, dispatches) INSIDE waitFor —
     *     the callback may run many times. Trigger the action first,
     *     then assert inside waitFor.
     *   • Don't make multiple unrelated assertions inside one waitFor;
     *     a later assertion failing keeps retrying the earlier ones.
     *   • Avoid arbitrary `setTimeout` / `await new Promise(r=>...)`;
     *     waitFor is deterministic and self-cleaning.
     * ─────────────────────────────────────────────────────────────────
     */
    it('can fetch a list of comments and display them', async () => {
        renderApp();

        // The "Fetch Comments" button has className="fetch-comments";
        // RTL doesn't query by class, so we grab it by its accessible
        // name (the button's text content).
        fireEvent.click(screen.getByRole('button', { name: /fetch comments/i }));

        // Poll the DOM until five <li> elements have been rendered.
        // `screen.getAllByRole('listitem')` throws when zero match, which
        // is exactly the signal waitFor uses to keep retrying.
        await waitFor(() => {
            expect(screen.getAllByRole('listitem')).toHaveLength(5);
        });
    });

});

// It also renders a <textarea> and a submit button — both are  strong signals that CommentBox mounted.         