import commentsReducer from '../comments';
import { SAVE_COMMENT } from '../actions/types';


it('handles actions of type SAVE_COMMENT', () => {
    // Here we are creating a fake action that has the same type and payload as the action that would be dispatched by the saveComment action creator. This is just a plain JavaScript object that represents the action we want to test.
    const action = {
        type: SAVE_COMMENT,
        payload: 'new comment'
    };

    // and then we call the reducer with an empty array and the action, and expect to get back a new array that contains the new comment.
    const newState = commentsReducer([], action);
    // The expect function is a Jest assertion that checks if the newState returned by the reducer is equal to the expected array ['new comment']. If the reducer is working correctly, it should return a new array that includes the new comment from the action's payload.
    expect(newState).toEqual(['new comment']);
})



it('handles action with unknown type', () => {
    // Here we are testing how the reducer handles an action with a type that it doesn't recognize. We create a fake action with a type of 'UNKNOWN_ACTION' and an empty payload.
    const action = {
        type: 'UNKNOWN_ACTION',
        payload: ''
    };

    // We then call the reducer with an empty array and the unknown action, and expect to get back the same empty array. This is because the reducer should return the current state unchanged when it receives an action type that it doesn't handle.
    const newState = commentsReducer([], action);
    expect(newState).toEqual([]);
})
