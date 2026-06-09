import App from './App';
import { render, screen, waitFor } from '@testing-library/react';
import user from '@testing-library/user-event';

describe('Doing some intial testing', () => {
    test('loads 6 products when the page loads first', async () => {
        render(<App />);
        const titles = await screen.findAllByRole('heading');
        expect(titles.length).toBe(6);
    });
    test('find the button and click it see if loads 6 more products', async () => {
        render(<App />);
        // We will use the built in ARIA method findByRole.
        // This will take the element type we are searching for as the first argument
        // The second can be an object with matching attribute
        // we are looing for a regex with load more string case insensetive
        const button = await screen.findByRole('button', {
            name: /load more/i,
        });
        user.click(button);
        // waitFor is used to wait for an assertion to pass before moving on. 
        // This is useful when we are waiting for an element to appear after an async action.
        await waitFor(async () => {
            const titles = await screen.findAllByRole('heading');
            expect(titles.length).toBe(12);
        });
    });
    // The other way to do the same thing above is:
    // This works because findByRole will wait for the element to appear before returning it, so we don't need to use waitFor.
    // However, this approach is less flexible than using waitFor, because it will only work if the element appears within the default timeout period (which is usually 1000ms). If the element takes longer to appear, the test will fail. 
    test('find the button and click it see if loads 6 more products', async () => {
        render(<App />);
        const button = await screen.findByRole('button', {
            name: /load more/i,
        });
        user.click(button);
        const titles = await screen.findAllByRole('heading');
        expect(titles.length).toBe(12);
    });

});
