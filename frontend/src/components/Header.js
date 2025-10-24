import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-item">Dashboard</Link>
            <Link to="/profile" className="nav-item">Profile</Link>
            <button onClick={handleLogout} className="nav-item logout-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/" className="nav-item">Landing</Link>
            <Link to="/login" className="nav-item">Login</Link>
            <Link to="/register" className="nav-item">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
