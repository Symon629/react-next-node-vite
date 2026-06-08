
// We are creating a custom middleware for handling asynchronous actions in our Redux application. Middleware in Redux is a way to extend the functionality of the store by intercepting actions before they reach the reducers. This allows us to perform side effects, such as making API calls, before the action is processed by the reducers.

// The middleware is a function that returns another function, which in turn returns another function. This is a common pattern in JavaScript known as "currying". The first function takes the store as an argument, the second function takes the next middleware in the chain as an argument, and the third function takes the action as an argument.

// In this middleware, we will check if the action has a payload that is a promise. If it does, we will wait for the promise to resolve and then dispatch a new action with the resolved value as the payload. If the action does not have a payload that is a promise, we will simply pass it to the next middleware in the chain.

// dispatch is a function that sends an action to the Redux store. The store will then process the action and update the state accordingly. In our middleware, we will use dispatch to send a new action with the resolved value of the promise as the payload.
export default ({ dispatch }) => next => action => {
    // Check if the action has a payload and if that payload is a promise.
    // If not return next(action)

    debugger
    if (!action.payload || !action.payload.then) {
        return next(action);
    }


    // If it does, we want to wait for the promise to resolve before dispatching a new action with the resolved value as the payload.

    // If the payload is a promise, we want to wait for it to resolve.
    action.payload.then(response => {
        // Once the promise resolves, we want to create a new action with the same type as the original action, but with the resolved value as the payload.
        const newAction = { ...action, payload: response };
        // We then dispatch this new action to the Redux store.
        dispatch(newAction);
    });


}



