import { Provider } from 'react-redux';
import { combineReducers, createStore, applyMiddleware } from 'redux';
import commentsReducer from './redux/comments';
import React from 'react';
import reduxPromise from "redux-promise";

const rootReducer = combineReducers({ comments: commentsReducer });

export default ({ children, initialState = {} }) => {
    const store = createStore(rootReducer, initialState, applyMiddleware(reduxPromise));
    return <Provider store={store}>{children}</Provider>;
};