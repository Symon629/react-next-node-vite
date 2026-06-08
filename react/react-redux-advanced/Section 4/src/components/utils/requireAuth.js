import React from 'react';
import { connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export default (ChildComponent) => {
    class ComposedComponent extends React.Component {
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

        render() {
            return <ChildComponent {...this.props} />
        }
    }
    function mapStateToProps(state) {
        return {
            auth: state.auth
        }
    }

    function withNavigate(WrappedComponent) {
        return function WithNavigateProps(props) {
            // Hooks can run here because this is a function component.
            const navigate = useNavigate();
            return <WrappedComponent {...props} navigate={navigate} />;
        }
    }

    // Connect auth first, then inject navigate via HOC so class lifecycle
    // methods can redirect unauthenticated users.
    const ConnectedComponent = connect(mapStateToProps)(ComposedComponent);
    return withNavigate(ConnectedComponent);
}




