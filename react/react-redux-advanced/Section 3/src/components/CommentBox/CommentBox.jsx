import React from 'react';
// `react-redux` exports `connect` as a NAMED export, not a default.
// `import connect from 'react-redux'` would set `connect` to `undefined`
// and crash at the bottom of this file with "connect is not a function".
import { connect } from 'react-redux';
import * as actions from '../../redux/actions';
import { useNavigate } from 'react-router-dom';
import requireAuth from '../utils/requireAuth';

// useNavigate is a hook, so we read it in a function component and pass it
// into the class component as a normal prop.


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

    // componentDidMount() lifecycle method is called by React immediately after a component is mounted (inserted into the tree) Meaning its get rendered for the first time. This is a good place to initiate API calls or set up subscriptions. If you need to load data from a remote endpoint, this is a good place to instantiate the network request
    // This is a good place to initiate API calls or set up subscriptions. 

    // component just rendered for the first time, 

    componentDidMount() {
        this.shouldNavigateAway();
    }

    // componentDidUpdate() lifecycle method is called by React immediately after updating occurs. This method is not called for the initial render. 
    // This is a good place to perform network requests as long as you compare the current props to previous props (e.g. a network request may not be necessary if the props have not changed).
    // so this will be called every time the component updates, which means every time the user types in the textarea, this method will be called. 
    // We can use this method to check if the user is authenticated, and if not, we can navigate them away from the CommentBox component. This is a simple way to protect the CommentBox component from being accessed by unauthenticated users.
    // even when the users parent component (App) re-renders, the CommentBox component will also re-render, which will trigger the componentDidUpdate method. 
    // So if the user clicks the "Sign Out" button in the App component, which updates the auth state to false, the CommentBox component will re-render and trigger the componentDidUpdate method, which will then check if the user is authenticated and navigate them away if they are not.
    componentDidUpdate() {
        this.shouldNavigateAway();
    }

    shouldNavigateAway() {
        if (!this.props.auth) {
            // If the user is not authenticated, navigate them away from the CommentBox component. In this case, we will navigate them to the home page ("/") using the window.location object.
            // 
            if (this.props.navigate) {
                this.props.navigate('/');
            }
        }
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
                <div>
                    {/* // Here we are rendering a button that, when clicked, will call the fetchComments action creator, which is available as a prop because of the connect function at the bottom of this file. The fetchComments action creator will dispatch an action to the Redux store, which will then update the state with the fetched comments. */}
                    <button className="fetch-comments" type="button" onClick={this.props.fetchComments}>
                        Fetch Comments
                    </button>
                </div>
            </form>
        );
    }
}



// the first argument to connect is mapStateToProps, which is a function that takes the Redux store state and maps it to props for the component.
//  In this case, we don't need to map any state to props, so we pass null as the
// Connect Redux first; this injects auth + action creators into CommentBox.
// the second argument to connect is mapDispatchToProps, which is an object that contains action creators.
//  The connect function will automatically bind these action creators to the dispatch function, so that when we call them in our component, they will dispatch the corresponding actions to the Redux store. In this case, we are passing all the action creators from the actions file, which means that all of our action creators will be available as props in the CommentBox component.
const ConnectedCommentBox = connect(null, actions)(requireAuth(CommentBox));
export default ConnectedCommentBox;