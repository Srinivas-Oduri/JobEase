import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Questions = () => {
  const [questions, setQuestions] = useState({
    'Are you legally authorized to work in this country': '',
    'Will you now or in the future require sponsorship for employment (e.g., H-1B)': '', // Removed period
    'What is your desired start date': '',
    'Are you willing to relocate': '',
    'What are your salary expectations for this role': '',
    'Why are you interested in this position': '',
    'How did you hear about this job opening': '',
  });

  const navigate = useNavigate();

  const onChange = e => {
    setQuestions({ ...questions, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();
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

      const additionalQuestions = new Map();
      for (const key in questions) {
        additionalQuestions.set(key, questions[key]);
      }

      const body = JSON.stringify({
        additionalQuestions: Object.fromEntries(additionalQuestions),
        // domainInterests will now be inferred from resume or other means
      });

      await axios.put('/api/users/profile', body, config);
      console.log('Additional questions saved!');
      navigate('/onboarding/resume'); // Move to resume upload
    } catch (err) {
      console.error(err.response ? err.response.data : err.message);
    }
  };

  return (
    <div className="container">
      <h1 className="large text-primary">Additional Application Information</h1>
      <p className="lead">Please answer a few questions that are commonly asked in job applications and are not typically found in a resume.</p>
      <form className="form" onSubmit={onSubmit}>
        {Object.keys(questions).map((question, index) => (
          <div className="form-group" key={index}>
            <label>{question}</label>
            <input
              type="text"
              placeholder={question}
              name={question}
              value={questions[question]}
              onChange={onChange}
              required
            />
          </div>
        ))}
        <input type="submit" className="btn btn-primary" value="Next" />
      </form>
    </div>
  );
};

export default Questions;
