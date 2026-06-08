import { combineReducers, createStore, applyMiddleware } from "redux";
import commentsReducer from "./reducers/comments";
import authReducer from "./reducers/auth";
import reduxPromise from "redux-promise";
import async from "./middleware/async";


const rootReducer = combineReducers({
    comments: commentsReducer,
    auth: authReducer
});

const initialState = {};
const store = createStore(rootReducer, initialState, applyMiddleware(async));

export default store;