import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const [user, setUser] = useState(null);
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
      } catch (err) {
        console.error(err.response ? err.response.data : err.message);
        navigate('/login'); // Redirect to login if token is invalid or expired
      }
    };

    fetchUserProfile();
  }, [navigate]);

  if (!user) {
    return <div className="container">Loading profile...</div>;
  }

  return (
    <div className="container">
      <h1 className="large text-primary">User Profile</h1>
      <p className="lead">Welcome, {user.username}!</p>
      <div className="profile-details">
        <h2>Contact Information</h2>
        <p><strong>Email:</strong> {user.email}</p>

        <h2>Additional Questions</h2>
        {user.additionalQuestions && Object.keys(user.additionalQuestions).length > 0 ? (
          <ul>
            {Object.entries(user.additionalQuestions).map(([question, answer]) => (
              <li key={question}><strong>{question}:</strong> {answer}</li>
            ))}
          </ul>
        ) : (
          <p>No additional questions answered yet. <a href="/onboarding/questions">Answer now</a></p>
        )}

        <h2>Resume Data</h2>
        {user.resumeData ? (
          <div>
            <p><strong>Skills:</strong> {user.resumeData.skills ? user.resumeData.skills.join(', ') : 'N/A'}</p>
            <p><strong>Experience:</strong></p>
            <ul>
              {user.resumeData.experience && user.resumeData.experience.length > 0 ? (
                user.resumeData.experience.map((exp, index) => (
                  <li key={index}>{exp.title} at {exp.company || 'N/A'} ({exp.duration || 'N/A'})</li>
                ))
              ) : (
                <li>No experience data.</li>
              )}
            </ul>
            <p><strong>Education:</strong></p>
            <ul>
              {user.resumeData.education && user.resumeData.education.length > 0 ? (
                user.resumeData.education.map((edu, index) => (
                  <li key={index}>{edu.degree} from {edu.institution || 'N/A'} ({edu.year || 'N/A'})</li>
                ))
              ) : (
                <li>No education data.</li>
              )}
            </ul>
            <p><strong>Resume File:</strong> {user.resumeFile ? <a href={`/${user.resumeFile}`} target="_blank" rel="noopener noreferrer">View Resume</a> : 'Not uploaded yet.'}</p>
          </div>
        ) : (
          <p>No resume data available. <a href="/onboarding/resume">Upload resume</a></p>
        )}

        <h2>Domain Interests</h2>
        {user.domainInterests && user.domainInterests.length > 0 ? (
          <p>{user.domainInterests.join(', ')}</p>
        ) : (
          <p>No domain interests specified. <a href="/onboarding/questions">Update interests</a></p>
        )}
      </div>
    </div>
  );
};

export default Profile;
