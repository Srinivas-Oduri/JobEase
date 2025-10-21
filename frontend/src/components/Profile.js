import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Ensure App.css is imported for global styles
import './Profile.css'; // Import the new CSS file

const Profile = () => {
  useEffect(() => {
    document.body.classList.remove('no-scroll');
  }, []);
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
    return <div className="profile-container loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-overlay"></div>
      <div className="profile-content">
        <h1 className="profile-header">User Profile</h1>
        <p className="profile-welcome">Welcome, {user.username}!</p>

        <div className="profile-grid">
        {/* Personal Information Section */}
        <div className="profile-section personal-info-section">
          <h2 className="section-title">Personal Information</h2>
          {user.resumeData && user.resumeData.personalInfo ? (
            <div className="section-content">
              <div className="data-item">
                <strong>Name:</strong> {user.resumeData.personalInfo.name || 'N/A'}
              </div>
              <div className="data-item">
                <strong>Email:</strong> {user.resumeData.personalInfo.email || user.email || 'N/A'}
              </div>
              <div className="data-item">
                <strong>Phone:</strong> {user.resumeData.personalInfo.phone || 'N/A'}
              </div>
              <div className="data-item">
                <strong>LinkedIn:</strong> {user.resumeData.personalInfo.linkedin ? <a href={user.resumeData.personalInfo.linkedin} target="_blank" rel="noopener noreferrer">{user.resumeData.personalInfo.linkedin}</a> : user.additionalQuestions.linkedin ? <a href={user.additionalQuestions.linkedin} target="_blank" rel="noopener noreferrer">{user.additionalQuestions.linkedin}</a> : 'N/A'}
              </div>
              <div className="data-item">
                <strong>GitHub:</strong> {user.resumeData.personalInfo.github ? <a href={user.resumeData.personalInfo.github} target="_blank" rel="noopener noreferrer">{user.resumeData.personalInfo.github}</a> : user.additionalQuestions.github ? <a href={user.additionalQuestions.github} target="_blank" rel="noopener noreferrer">{user.additionalQuestions.github}</a> : 'N/A'}
              </div>
              <div className="data-item">
                <strong>Portfolio:</strong> {user.resumeData.personalInfo.portfolio ? <a href={user.resumeData.personalInfo.portfolio} target="_blank" rel="noopener noreferrer">{user.resumeData.personalInfo.portfolio}</a> : 'N/A'}
              </div>
              <div className="data-item">
                <strong>Address:</strong> {user.resumeData.personalInfo.address || 'N/A'}
              </div>
            </div>
          ) : (
            <p className="no-data-message">No personal information available.</p>
          )}
        </div>

        {/* Summary Section */}
        <div className="profile-section summary-section">
          <h2 className="section-title">Summary</h2>
          {user.resumeData && user.resumeData.summary ? (
            <div className="section-content">
              <p>{user.resumeData.summary}</p>
            </div>
          ) : (
            <p className="no-data-message">No summary available.</p>
          )}
        </div>

        {/* Resume Data Section (Skills, Experience, Education) */}
        <div className="profile-section resume-data-section">
          <h2 className="section-title">Resume Data</h2>
          {user.resumeData ? (
            <div className="section-content">
              <div className="data-item">
                <strong>Skills:</strong> {user.resumeData.skills && user.resumeData.skills.length > 0 ? user.resumeData.skills.join(', ') : 'N/A'}
              </div>
              <div className="data-item">
                <strong>Experience:</strong>
                <ul className="data-list">
                  {user.resumeData.experience && user.resumeData.experience.length > 0 ? (
                    user.resumeData.experience.map((exp, index) => (
                      <li key={index}>{exp.title} at {exp.company || 'N/A'} ({exp.duration || 'N/A'})</li>
                    ))
                  ) : (
                    <li>No experience data.</li>
                  )}
                </ul>
              </div>
              <div className="data-item">
                <strong>Education:</strong>
                <ul className="data-list">
                  {user.resumeData.education && user.resumeData.education.length > 0 ? (
                    user.resumeData.education.map((edu, index) => (
                      <li key={index}>{edu.degree} from {edu.institution || 'N/A'} ({edu.year || 'N/A'})</li>
                    ))
                  ) : (
                    <li>No education data.</li>
                  )}
                </ul>
              </div>
              <div className="data-item">
                <strong>Resume File:</strong> {user.resumeFile ? <a href={`/${user.resumeFile}`} target="_blank" rel="noopener noreferrer" className="view-resume-link">View Resume</a> : 'Not uploaded yet.'}
              </div>
            </div>
          ) : (
            <p className="no-data-message">No resume data available. <a href="/onboarding/resume" className="action-link">Upload resume</a></p>
          )}
        </div>

        {/* Projects Section */}
        <div className="profile-section projects-section">
          <h2 className="section-title">Projects</h2>
          {user.resumeData && user.resumeData.projects && user.resumeData.projects.length > 0 ? (
            <ul className="data-list">
              {user.resumeData.projects.map((project, index) => (
                <li key={index} className="data-item">
                  <strong>{project.title}:</strong> {project.description}
                  {project.technologies && project.technologies.length > 0 && (
                    <span> (Technologies: {project.technologies.join(', ')})</span>
                  )}
                  {project.link && (
                    <span> - <a href={project.link} target="_blank" rel="noopener noreferrer">Link</a></span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data-message">No projects available.</p>
          )}
        </div>

        {/* Achievements Section */}
        <div className="profile-section achievements-section">
          <h2 className="section-title">Achievements</h2>
          {user.resumeData && user.resumeData.achievements && user.resumeData.achievements.length > 0 ? (
            <ul className="data-list">
              {user.resumeData.achievements.map((achievement, index) => (
                <li key={index} className="data-item">
                  <strong>{achievement.name}</strong> {achievement.issuer && `(${achievement.issuer})`} {achievement.date && ` - ${achievement.date}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data-message">No achievements available.</p>
          )}
        </div>

        {/* Certifications Section */}
        <div className="profile-section certifications-section">
          <h2 className="section-title">Certifications</h2>
          {user.resumeData && user.resumeData.certifications && user.resumeData.certifications.length > 0 ? (
            <ul className="data-list">
              {user.resumeData.certifications.map((cert, index) => (
                <li key={index} className="data-item">
                  <strong>{cert.name}</strong> {cert.issuer && `(${cert.issuer})`} {cert.date && ` - ${cert.date}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data-message">No certifications available.</p>
          )}
        </div>

        {/* Languages Section */}
        <div className="profile-section languages-section">
          <h2 className="section-title">Languages</h2>
          {user.resumeData && user.resumeData.languages && user.resumeData.languages.length > 0 ? (
            <div className="section-content">
              <p className="data-item">{user.resumeData.languages.join(', ')}</p>
            </div>
          ) : (
            <p className="no-data-message">No languages specified.</p>
          )}
        </div>

        {/* Additional Questions Section */}
        <div className="profile-section questions-section">
          <h2 className="section-title">Additional Questions</h2>
          {user.additionalQuestions && Object.keys(user.additionalQuestions).length > 0 ? (
            <ul className="data-list">
              {Object.entries(user.additionalQuestions).map(([question, answer]) => (
                <li key={question} className="data-item"><strong>{question}:</strong> {typeof answer === 'object' ? JSON.stringify(answer) : answer}</li>
              ))}
            </ul>
          ) : (
            <p className="no-data-message">No additional questions answered yet. <a href="/onboarding/questions" className="action-link">Answer now</a></p>
          )}
        </div>

        {/* Domain Interests Section */}
        <div className="profile-section domain-interests-section">
          <h2 className="section-title">Domain Interests</h2>
          {user.domainInterests && user.domainInterests.length > 0 ? (
            <div className="section-content">
              <p className="data-item">{user.domainInterests.join(', ')}</p>
            </div>
          ) : (
            <p className="no-data-message">No domain interests specified. <a href="/onboarding/questions" className="action-link">Update interests</a></p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
