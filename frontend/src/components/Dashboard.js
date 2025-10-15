import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [numJobs, setNumJobs] = useState(1); // Default to 1 job
  const [jobType, setJobType] = useState('job'); // Default to 'job'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No token found, please log in.');
          navigate('/login');
          return;
        }

        const config = {
          headers: {
            'x-auth-token': token
          }
        };

        const res = await axios.get('/api/users/profile', config);
        setUser(res.data);
        setLoading(false);
      } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        navigate('/login');
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleStartApply = async () => {
    setApplying(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found, please log in.');
        navigate('/login');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        }
      };

      const body = JSON.stringify({ numJobs, jobType });

      const res = await axios.post('/api/agents/start-application', body, config);
      console.log('Application process started:', res.data);
      // Optionally, refresh user data to show new application status
      // await fetchUserProfile();
    } catch (err) {
      console.error('Error starting application process:', err.response ? err.response.data : err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="container">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="container">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="container">
      <h1 className="large text-primary">Dashboard</h1>
      <p className="lead">Welcome, {user.username}!</p>

      <div className="dashboard-actions">
        <div className="form-group">
          <label htmlFor="numJobs">Number of Jobs to Apply:</label>
          <input
            type="number"
            id="numJobs"
            name="numJobs"
            min="1"
            value={numJobs}
            onChange={(e) => setNumJobs(e.target.value)}
            disabled={applying}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="jobType">Job Type:</label>
          <select
            id="jobType"
            name="jobType"
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            disabled={applying}
            className="form-control"
          >
            <option value="job">Job</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <button className="btn btn-primary my-2" onClick={handleStartApply} disabled={applying}>
          {applying ? 'Applying...' : 'Start Auto-Apply'}
        </button>
        <Link to="/profile" className="btn btn-light my-2">View Profile</Link>
      </div>

      <h2 className="my-2">Your Applications</h2>
      {user.applications && user.applications.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>Details</th>
              <th>Job Link</th>
            </tr>
          </thead>
          <tbody>
            {user.applications.map((app, index) => (
              <tr key={index}>
                <td>{app.jobTitle}</td>
                <td>{app.company}</td>
                <td>{new Date(app.applicationDate).toLocaleDateString()}</td>
                <td>{app.status}</td>
                <td>{app.issueDetails || 'N/A'}</td>
                <td>{app.jobLink ? <a href={app.jobLink} target="_blank" rel="noopener noreferrer">View Job</a> : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No applications yet. Click "Start Auto-Apply" to begin!</p>
      )}
    </div>
  );
};

export default Dashboard;
