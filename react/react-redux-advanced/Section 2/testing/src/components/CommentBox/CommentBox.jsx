import React from 'react';
// `react-redux` exports `connect` as a NAMED export, not a default.
// `import connect from 'react-redux'` would set `connect` to `undefined`
// and crash at the bottom of this file with "connect is not a function".
import { connect } from 'react-redux';
import * as actions from '../../redux/actions';

// Export the UNCONNECTED class as a named export so tests can render
// it directly without needing a Redux <Provider>. The default export
// (further down) is still the connected version used by the app.
export class CommentBox extends React.Component {
    constructor(props) {
        super(props);
        // `state` is a plain object that holds data this component owns.
        // Whenever state changes (via setState), React re-renders the component.
        this.state = { comment: '' };

        // ── Optional: bind once in the constructor instead of in render ──
        // this.handleChange = this.handleChange.bind(this);
        // this.handleSubmit = this.handleSubmit.bind(this);
    }

    // Regular class methods are NOT automatically bound to the instance.
    // If you pass `this.handleChange` directly to JSX without binding,
    // `this` inside the method will be `undefined` (in strict mode) and
    // `this.setState(...)` will throw "Cannot read properties of undefined".
    handleChange(event) {
        // `this` here must refer to the component instance so that
        // setState updates THIS component's state.
        this.setState({ comment: event.target.value });
    }

    handleSubmit(event) {
        event.preventDefault();
        console.log(this.state.comment);
        // save it to the redux store by calling the action creator, which is available as a prop because of the connect function at the bottom of this file. The saveComment action creator will dispatch an action to the Redux store, which will then update the state with the new comment.
        this.props.saveComment(this.state.comment);
        // Clear the textarea after submission by resetting the
        // controlled state value back to an empty string.
        this.setState({ comment: '' });
    }

    render() {
        return (
            // .bind(this) returns a NEW function whose `this` is permanently
            // locked to the component instance. Example:
            //
            //   const original = this.handleSubmit;             // unbound
            //   const bound    = this.handleSubmit.bind(this);  // bound
            //   original(e); // -> `this` is undefined, crashes
            //   bound(e);    // -> `this` is the CommentBox instance, works
            //
            // Downside: a fresh function is created on every render, which
            // can hurt performance and break shouldComponentUpdate / memo.
            // Prefer binding once in the constructor, or use an arrow
            // class field: `handleSubmit = (e) => { ... }` which auto-binds.

            // The "this" here inside bind(this) is the component instance, so the bound function's "this"
            <form onSubmit={this.handleSubmit.bind(this)}>
                <h4>Comment</h4>
                <textarea
                    value={this.state.comment}
                    onChange={this.handleChange.bind(this)}
                />
                <div>
                    <button type="submit">Submit Comment</button>
                </div>
            </form>
        );
    }
}

// the first argument to connect is mapStateToProps, which is a function that takes the Redux store state and maps it to props for the component.
//  In this case, we don't need to map any state to props, so we pass null as the

// the second argument to connect is mapDispatchToProps, which is an object that contains action creators.
//  The connect function will automatically bind these action creators to the dispatch function, so that when we call them in our component, they will dispatch the corresponding actions to the Redux store. In this case, we are passing all the action creators from the actions file, which means that all of our action creators will be available as props in the CommentBox component.
export default connect(null, actions)(CommentBox);