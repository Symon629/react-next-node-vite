import axios from 'axios';
import { SAVE_COMMENT, FETCH_COMMENTS, CHANGE_AUTH } from './types';

export function saveComment(comment) {
    return {
        type: SAVE_COMMENT,
        payload: comment
    };
}

export function fetchComments() {
    // moxios intercepts axios (not fetch), so use axios here so the
    // integration test's stubRequest actually catches this call.
    // redux-promise resolves the payload Promise with the axios response;
    // unwrap `.data` here so the reducer receives the array directly.
    const response = axios
        .get('https://jsonplaceholder.typicode.com/comments')
        .then(res => res.data);

    console.log(response);
    return {
        type: FETCH_COMMENTS,
        payload: response
    };
}
