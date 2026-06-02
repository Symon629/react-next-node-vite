import { combineReducers, createStore, applyMiddleware } from "redux";
import commentsReducer from "./reducers/comments";
import authReducer from "./reducers/auth";
import reduxPromise from "redux-promise";


const rootReducer = combineReducers({
    comments: commentsReducer,
    auth: authReducer
});

const initialState = {};
const store = createStore(rootReducer, initialState, applyMiddleware(reduxPromise));

export default store;