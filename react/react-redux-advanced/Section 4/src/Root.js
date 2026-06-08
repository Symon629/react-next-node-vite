import { Provider } from 'react-redux';
import React from 'react';
import store from './redux';

export default ({ children, initialState = {} }) => {

    return <Provider store={store}>{children}</Provider>;
}