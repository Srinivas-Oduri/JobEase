import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import Profile from './components/Profile';
import Questions from './components/onboarding/Questions';
import ResumeUpload from './components/onboarding/ResumeUpload';
import Dashboard from './components/Dashboard';
import Header from './components/Header'; // Import the new Header component

import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for token in localStorage on component mount
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // Clear the token
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} /> {/* Render the Header */}
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register onRegisterSuccess={handleLogin} />} />
          <Route path="/login" element={<Login onLoginSuccess={handleLogin} />} />
          {isAuthenticated && (
            <>
              <Route path="/profile" element={<Profile />} />
              <Route path="/onboarding/questions" element={<Questions />} />
              <Route path="/onboarding/resume" element={<ResumeUpload />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </>
          )}
          {/* Redirect unauthenticated users trying to access protected routes */}
          {!isAuthenticated && (
            <>
              <Route path="/profile" element={<Landing />} />
              <Route path="/onboarding/questions" element={<Landing />} />
              <Route path="/onboarding/resume" element={<Landing />} />
              <Route path="/dashboard" element={<Landing />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
