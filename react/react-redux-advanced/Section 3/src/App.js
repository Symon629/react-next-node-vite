import './App.css';
import CommentBox from './components/CommentBox/CommentBox';
import CommentList from './components/CommentList/CommentList';
import { Route, Routes, Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { changeAuth } from './redux/actions';
import * as actions from './redux/actions';


import React, { Component } from "react";
class App extends Component {

  renderAuthButton() {
    console.log(this.props);
    if (this.props.auth) {
      return <button onClick={() => this.props.changeAuth(false)}>Sign Out</button>
    } else {
      return <button onClick={() => this.props.changeAuth(true)}>Sign In</button>
    }
  }

  renderHeader() {
    return <ul>

      <li><Link to="/">Home</Link></li>
      <li><Link to="/post">Post a Comment</Link></li>
      <li>{this.renderAuthButton()}</li>
    </ul>
  }

  render() {
    return <div>
      {this.renderHeader()}
      <Routes>
        <Route path="/" element={<CommentList />} />
        <Route path="/post" element={<CommentBox />} />

      </Routes>
    </div>

  }

}

const mapStateToProps = (state) => {
  return { auth: state.auth }
}

export default connect(mapStateToProps, actions)(App);

