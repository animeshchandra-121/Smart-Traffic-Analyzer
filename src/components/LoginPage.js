import React, { useState } from 'react';
import Header from './Header';

const LoginPage = ({ navigate }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/user/signin/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      // Log the response for debugging
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store the token in localStorage
      localStorage.setItem('authToken', data.token);

      // Login successful
      navigate('select-junction');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="card">
          <div className="logo-container">
            <div className="logo" style={{ maxWidth: '150px', width: '100px', height: '100px', fontSize: '1.5rem' }}>🚦</div>
          </div>
          <h1>Welcome Back</h1>
          <p className="subtitle">Please login to access the system</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <div style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label htmlFor="username">
                👤 Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">
                🔒 Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isLoading}
                required
              />
            </div>
            
            <button 
              onClick={handleSubmit} 
              className="main-btn" 
              style={{ width: '100%' }}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : '🔑 Login'}
            </button>
          </div>

          <div className="back-link">
            <button 
              onClick={() => navigate('home')} 
              className="main-btn" 
              style={{ 
                background: 'transparent', 
                color: '#3498db',
                border: '2px solid #3498db',
                boxShadow: 'none',
                marginTop: '1rem'
              }}
              disabled={isLoading}
            >
              ⬅️ Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage; 