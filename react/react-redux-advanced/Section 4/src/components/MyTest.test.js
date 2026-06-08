import { render, screen } from '@testing-library/react';
import React from "react";
import MyTest from "./MyTest";

// Here "it" is an function that takes a string and a function as arguments. The string is the name of the test and the function is the test itself. 
// The test is to check if the App component renders without crashing and if it contains the text "Welcome". The render function is used to render the App component and the screen.getByText function is used to check if the text "Welcome" is in the document. 
// The expect function is used to assert that the text is in the document.
it("renders without crashing", () => {
  // render is a function that takes a React element and renders it to the DOM.
  // In this case, we are rendering the MyTest component.
  render(<MyTest />);
  // Here the expect function is used to check if the text "Welcome" is in the document. 
  // The toBeInTheDocument function is a matcher that checks if the element is in the document.
  expect(screen.getByText("Welcome")).toBeInTheDocument();
});

// the other way of doing thea above test is as follows:
it("renders without crashing", () => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  render(<MyTest />, { container: div });
  expect(div.innerHTML).toContain("Welcome");
});

