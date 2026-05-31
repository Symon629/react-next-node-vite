import React from 'react';
import { render, screen } from '@testing-library/react';
import { mount } from 'enzyme';
import Root from '../../../Root';
import CommentList from '../CommentList';

const comments = ['Comment 1', 'Comment 2'];

let wrapped;

beforeEach(() => {
    wrapped = mount(
        <Root initialState={{ comments }}>
            <CommentList />
        </Root>
    );
});

afterEach(() => {
    wrapped.unmount();
});

it("shows the list of comments(enzyme)", () => {
    expect(wrapped.find("li").length).toEqual(comments.length);
    // Now lets assert the values of the comments are there, 
    comments.forEach(comment => {
        expect(wrapped.render().text()).toContain(comment);
    });

});

it("shows the list of comments(react-testing-library)", () => {
    // RTL renders into its own container, completely separate from the
    // Enzyme `mount` above. We seed redux state via Root's initialState
    // so the connected CommentList sees `state.comments`.
    render(
        <Root initialState={{ comments }}>
            <CommentList />
        </Root>
    );

    // Every <li> has the implicit ARIA role "listitem". Querying by role
    // mirrors how assistive tech sees the page and is RTL's preferred API.
    expect(screen.getAllByRole('listitem')).toHaveLength(comments.length);

    // Assert each comment's text reached the DOM. `getByText` throws if
    // the text is missing, so this doubles as a presence check.
    comments.forEach(comment => {
        expect(screen.getByText(comment)).toBeInTheDocument();
    });
});