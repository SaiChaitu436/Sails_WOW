import React from "react";
import "./DashboardHeader.css";

const DashboardHeader = () => {
  return (
    <div className="dashboard-header-wrapper">
      <svg
        className="dashboard-header-bg"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1200 80"
      >
        <defs>
          {/* Light blue gradient for left section */}
          <linearGradient id="lightBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B8DDF2" />
            <stop offset="100%" stopColor="#A8D4ED" />
          </linearGradient>
          
          {/* Lighter blue diagonal overlay */}
          <linearGradient id="lighterBlueOverlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D0E8F5" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#C5E1F0" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#B8DAEB" stopOpacity="0.65" />
          </linearGradient>
          
          {/* Dark blue gradient for right section */}
          <linearGradient id="darkBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#152A47" />
          </linearGradient>
        </defs>
        
        {/* Base light blue background for left section */}
        <rect x="0" y="0" width="1200" height="80" fill="url(#lightBlueGradient)" />
        
        {/* Lighter blue diagonal overlay on left section */}
        <polygon
          points="0,0 700,0 620,80 0,80"
          fill="url(#lighterBlueOverlay)"
        />
        
        {/* White diagonal separator */}
        <polygon
          points="700,0 720,0 640,80 620,80"
          fill="#FFFFFF"
        />
        
        {/* Dark blue background for right section */}
        <polygon
          points="720,0 1200,0 1200,80 640,80"
          fill="url(#darkBlueGradient)"
        />
      </svg>
      
      <div className="dashboard-header-content">
        {/* Left section - SAILS Software logo */}
        <div className="dashboard-header-left">
          <img
            src="/images/sails-logo.png"
            alt="SAILS Software"
            className="dashboard-header-logo-left"
          />
        </div>
        
        {/* Right section - WoW logo */}
        <div className="dashboard-header-right me-4">
          <img
            src="/images/wow.png"
            alt="WoW - Way of Working"
            className="dashboard-header-logo-right"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
