import React, { useState, useRef, useEffect } from "react";
import "./DownloadButton.css";

const DownloadButton = ({ onDownloadCSV, onDownloadPDF, disabled = false }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleCSVClick = () => {
    if (onDownloadCSV) {
      onDownloadCSV();
    }
    setShowMenu(false);
  };

  const handlePDFClick = () => {
    if (onDownloadPDF) {
      onDownloadPDF();
    }
    setShowMenu(false);
  };

  return (
    <div className="download-button-container" ref={menuRef}>
      <button
        className="download-button"
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled}
        title="Download"
      >
        <i className="fas fa-download"></i>
      </button>

      {showMenu && (
        <div className="download-menu">
          <button
            className="download-menu-item"
            onClick={handleCSVClick}
            disabled={disabled}
          >
            <i className="fas fa-file-csv"></i>
            <span>Download CSV</span>
          </button>
          <button
            className="download-menu-item"
            onClick={handlePDFClick}
            disabled={disabled}
          >
            <i className="fas fa-file-pdf"></i>
            <span>Download PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DownloadButton;

