import './App.css';
import CommentBox from './components/CommentBox/CommentBox';
import CommentList from './components/CommentList/CommentList';
import { Route, Routes } from 'react-router-dom';

import React, { Component } from "react";
class App extends Component {
  render() {
    return <div>
      <Routes>
        <Route path="/" element={<CommentList />} />
        <Route path="/post" element={<CommentBox />} />

      </Routes>
    </div>

  }

}

export default App;

