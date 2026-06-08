import { SAVE_COMMENT, FETCH_COMMENTS } from '../actions/types';


export default function (state = [], action) {
    switch (action.type) {
        case SAVE_COMMENT:
            return [...state, action.payload];
        case FETCH_COMMENTS:
            // you could use the debugger here to inspect the action.payload and see what it looks like, which can help you understand how to extract the data you need for your reducer.
            // Open the browser's developer tools and set a breakpoint on the line with the debugger statement. Then, trigger the FETCH_COMMENTS action (e.g., by clicking a button that dispatches this action) and inspect the action.payload in the console to see its structure and contents. This will help you understand how to extract the relevant data for your reducer.
            // debugger;
            const comments = action.payload.map(comment => comment.name);
            return [...state, ...comments];
        default:
            return state;
    }
}
