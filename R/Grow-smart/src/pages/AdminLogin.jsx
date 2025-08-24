// src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';


const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Check if the user is an admin
      const roleDoc = await getDoc(doc(db, 'roles', user.uid));
      if (roleDoc.exists() && roleDoc.data().role === 'admin') {
        localStorage.setItem('isAdmin', 'true'); 
        navigate('/admin'); 
      } else {
        setError('🚫 You are not authorized to access the admin panel.');
      }
    } catch (err) {
      setError('⚠️ Invalid admin credentials');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="admin-wrapper">
      <div className="admin-card">
        <h2 className="admin-title">Admin Login</h2>
        <p className="admin-subtitle">Sign in to GrowSmart Admin Panel</p>
        {error && <p className="admin-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label className="admin-form-label">Email Address</label>
            <input
              type="email"
              className="admin-form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Password</label>
            <input
              type="password"
              className="admin-form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="admin-btn">
            Sign In
          </button>
        </form>

        {/* Optional link back to normal login */}
        <div className="admin-link">
          <a href="/login">← Back to User Login</a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
