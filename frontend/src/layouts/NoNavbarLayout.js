import React from "react";
import "./NoNavbarLayout.css";

const NoNavbarLayout = ({ children }) => {
  return (
    <div className="no-navbar-layout">
      <main className="main-content no-navbar">
        {children}
      </main>
    </div>
  );
};

export default NoNavbarLayout;

