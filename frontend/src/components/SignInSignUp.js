import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button } from 'react-bootstrap';
import './SignInSignUp.css';

const SignInSignUp = () => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password || !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isSignIn && !formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Store user data in localStorage (temporary until backend is ready)
    if (!isSignIn) {
      localStorage.setItem('user', JSON.stringify({
        fullName: formData.fullName,
        email: formData.email
      }));
    } else {
      // For sign in, check if user exists
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        setErrors({ email: 'No account found. Please sign up first.' });
        return;
      }
    }

    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="signin-signup-container">
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Card className="auth-card">
          <Card.Body className="p-5">
            <div className="text-center mb-4">
              <h1 className="auth-title">SEA Portal</h1>
              <p className="auth-subtitle">Sails Employee Assistant</p>
            </div>

            <div className="auth-toggle mb-4">
              <button
                type="button"
                className={`toggle-btn ${isSignIn ? 'active' : ''}`}
                onClick={() => setIsSignIn(true)}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`toggle-btn ${!isSignIn ? 'active' : ''}`}
                onClick={() => setIsSignIn(false)}
              >
                Sign Up
              </button>
            </div>

            <Form onSubmit={handleSubmit}>
              {!isSignIn && (
                <Form.Group className="mb-3">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    isInvalid={!!errors.fullName}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.fullName}
                  </Form.Control.Feedback>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@company.com"
                  isInvalid={!!errors.email}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  isInvalid={!!errors.password}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.password}
                </Form.Control.Feedback>
              </Form.Group>

              <Button
                type="submit"
                className="w-100 auth-submit-btn"
              >
                {isSignIn ? 'Sign In' : 'Sign Up'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default SignInSignUp;

