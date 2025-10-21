import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css'; // Import the new CSS file

const Dashboard = () => {
  useEffect(() => {
    document.body.classList.remove('no-scroll');
  }, []);
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]); // New state for job applications
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [numJobs, setNumJobs] = useState(1); // Default to 1 job
  const [jobType, setJobType] = useState('job'); // Default to 'job'
  const navigate = useNavigate();

  const fetchJobApplications = async () => {
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

      const res = await axios.get('/api/agents/applications', config);
      setApplications(res.data);
    } catch (err) {
      console.error('Error fetching job applications:', err.response ? err.response.data : err.message);
    }
  };

  useEffect(() => {
    const fetchUserProfileAndApplications = async () => {
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

        const userRes = await axios.get('/api/users/profile', config);
        setUser(userRes.data);
        
        await fetchJobApplications(); // Fetch applications after user profile

        setLoading(false);
      } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        navigate('/login');
      }
    };

    fetchUserProfileAndApplications();
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
      await fetchJobApplications(); // Refresh applications after starting a new process
    } catch (err) {
      console.error('Error starting application process:', err.response ? err.response.data : err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-overlay"></div>
        <div className="dashboard-content">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-overlay"></div>
        <div className="dashboard-content">
          Please log in to view your dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-overlay"></div>
      <div className="dashboard-content">
        <h1 className="large">Dashboard</h1>
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
            >
              <option value="job">Job</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleStartApply} disabled={applying}>
            {applying ? 'Applying...' : 'Start Auto-Apply'}
          </button>
          <Link to="/profile" className="btn btn-light">View Profile</Link>
        </div>

        <div className="applications-section">
          <h2>Your Applications</h2>
          {applications && applications.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Company</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Issues</th>
                  <th>Job Link</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app._id}>
                    <td>{app.jobData.title}</td>
                    <td>{app.jobData.company}</td>
                    <td>{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td>{app.success ? 'Success' : 'Failed'}</td>
                    <td>{app.issues.length > 0 ? app.issues.join('; ') : 'N/A'}</td>
                    <td>{app.applicationLink ? <a href={app.applicationLink} target="_blank" rel="noopener noreferrer">View Job</a> : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No applications yet. Click "Start Auto-Apply" to begin!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
