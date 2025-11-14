import React from "react";
import ClientNavbar from "../components/client/ClientNavbar";
import "./ClientLayout.css";

const ClientLayout = ({ children }) => {
  return (
    <div className="client-layout sidebar-layout">
      <ClientNavbar />
      <main className="main-content with-sidebar">
        {children}
      </main>
    </div>
  );
};

export default ClientLayout;

