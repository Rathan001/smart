import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUserShield, FaBars } from 'react-icons/fa'; // ✅ Added hamburger icon

const Navigation = () => {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/crops', label: 'Crops' },
    { path: '/add-crop', label: 'Add Crop' },
    { path: '/weather', label: 'Weather' },
    { path: '/profile', label: 'Profile' },
    { path: '/crop-care', label: 'Crop Care' },
  ];

  return (
    <nav className="nav">
      <div className="nav-container">
        {/* Brand */}
        <Link to="/" className="nav-brand">GrowSmart</Link>

        {/* Toggle button for mobile */}
        <div className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <FaBars />
        </div>

        {/* Links */}
        <ul className={`nav-links ${menuOpen ? 'show' : ''}`}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)} // close on click
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link 
              to="/admin-login" 
              className={`nav-link ${location.pathname === '/admin-login' ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <FaUserShield size={16} style={{ marginRight: '6px' }} />
              Admin
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
