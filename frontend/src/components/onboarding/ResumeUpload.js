import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResumeUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();

  const onFileChange = e => {
    setSelectedFile(e.target.files[0]);
  };

  const onFileUpload = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found, please log in.');
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('resume', selectedFile);

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token
        }
      };

      // The backend /api/users/upload-resume endpoint should now handle parsing
      // and updating the user's resumeData in the database.
      await axios.post('/api/users/upload-resume', formData, config);
      console.log('Resume file uploaded and parsed successfully!');

      navigate('/dashboard'); // Go to dashboard after onboarding
    } catch (err) {
      console.error(err.response ? err.response.data : err.message);
    }
  };

  return (
    <div className="container">
      <h1 className="large text-primary">Upload Your Resume</h1>
      <p className="lead">Upload your resume to automatically extract and segregate your professional data.</p>
      <div className="form-group">
        <input type="file" onChange={onFileChange} />
      </div>
      <button className="btn btn-primary" onClick={onFileUpload}>
        Upload & Finish Onboarding
      </button>
    </div>
  );
};

export default ResumeUpload;
