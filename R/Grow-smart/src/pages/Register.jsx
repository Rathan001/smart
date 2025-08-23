import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../Components/auth/AuthContext'; // <-- Import useAuth

// Crop suggestions by location (expand as needed)
const cropSuggestionsByLocation = {
  Chennai: [
    'Tomato',
    'Brinjal',
    'Okra',
    'Chilli',
    'Coriander',
    'Spinach',
    // Add more crops for Chennai
  ],
  Delhi: [
    'Spinach',
    'Radish',
    'Carrot',
    'Peas',
    'Cauliflower',
    // Add more crops for Delhi
  ],
  Mumbai: [
    'Coriander',
    'Mint',
    'Chilli',
    'Cucumber',
    'Beans',
    // Add more crops for Mumbai
  ],
  Bangalore: [
    'Beans',
    'Capsicum',
    'Cucumber',
    'Tomato',
    'Lettuce',
    // Add more crops for Bangalore
  ],
  // Add more locations and their crops as needed
};

const getCropSuggestions = (location) => {
  const key = Object.keys(cropSuggestionsByLocation).find((loc) =>
    location.toLowerCase().includes(loc.toLowerCase())
  );
  return key ? cropSuggestionsByLocation[key] : [];
};

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    location: '',
    preferredCrops: '',
    gardenType: '',
    experience: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cropSuggestions, setCropSuggestions] = useState([]);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // <-- Get auth state

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Detect user's city using browser geolocation and OpenStreetMap
  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        const city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.state ||
          '';
        setFormData((prev) => ({
          ...prev,
          location: city
        }));
      } catch (err) {
        setError('Unable to detect city from location');
      }
    }, () => {
      setError('Unable to retrieve your location');
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    if (formData.location.length > 2) {
      setCropSuggestions(getCropSuggestions(formData.location));
    } else {
      setCropSuggestions([]);
    }
  }, [formData.location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Save user profile to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        location: formData.location,
        preferredCrops: formData.preferredCrops
          ? formData.preferredCrops.split(',').map((crop) => crop.trim())
          : [],
        gardenType: formData.gardenType,
        experience: formData.experience,
        createdAt: new Date(),
        totalCrops: 0,
        activeCrops: 0
      });

      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <h1 className="auth-title">Join GrowSmart</h1>
        <p className="text-center text-secondary mb-4">
          Start your urban gardening journey today!
        </p>

        {error && (
          <div className="text-error text-center mb-4" aria-live="assertive">
            {error}
          </div>
        )}
        {success && (
          <div className="text-success text-center mb-4" aria-live="polite">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              className="form-input"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">
              Location
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                id="location"
                name="location"
                className="form-input"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="City, State/Country"
                autoComplete="address-level2"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={detectLocation}
                style={{ whiteSpace: 'nowrap' }}
              >
                Detect My Location
              </button>
            </div>
            {/* Crop suggestions */}
            {cropSuggestions.length > 0 && (
              <div className="crop-suggestions">
                <span>Suggested Crops:</span>
                <ul>
                  {cropSuggestions.map((crop, idx) => (
                    <li
                      key={idx}
                      style={{ cursor: 'pointer', color: '#ae7b6a' }}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          preferredCrops: prev.preferredCrops
                            ? prev.preferredCrops + ', ' + crop
                            : crop
                        }))
                      }
                    >
                      {crop}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="preferredCrops">
              Preferred Crops
            </label>
            <input
              type="text"
              id="preferredCrops"
              name="preferredCrops"
              className="form-input"
              value={formData.preferredCrops}
              onChange={handleChange}
              placeholder="e.g., tomatoes, herbs, lettuce (comma separated)"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gardenType">
              Garden Type
            </label>
            <select
              id="gardenType"
              name="gardenType"
              className="form-select"
              value={formData.gardenType}
              onChange={handleChange}
              required
            >
              <option value="">Select garden type</option>
              <option value="terrace">Terrace Garden</option>
              <option value="balcony">Balcony Garden</option>
              <option value="rooftop">Rooftop Garden</option>
              <option value="indoor">Indoor Garden</option>
              <option value="backyard">Backyard Garden</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="experience">
              Gardening Experience
            </label>
            <select
              id="experience"
              name="experience"
              className="form-select"
              value={formData.experience}
              onChange={handleChange}
              required
            >
              <option value="">Select experience level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
                minLength="6"
                autoComplete="new-password"
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((p) => !p)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          <p>
            Already have an account?{' '}
            <Link to="/login">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;