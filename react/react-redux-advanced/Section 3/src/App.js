import logo from './logo.svg';
import './App.css';
import CommentBox from './components/CommentBox/CommentBox';
import CommentList from './components/CommentList/CommentList';

import React, { Component } from "react";
class App extends Component {
  render() {
    return <div>
      <CommentBox />
      <CommentList />
    </div>

  }

}

export default App;

