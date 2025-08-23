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

      // Check if the user is an admin
      const roleDoc = await getDoc(doc(db, 'roles', user.uid));
      if (roleDoc.exists() && roleDoc.data().role === 'admin') {
        localStorage.setItem('isAdmin', 'true'); // Store admin session
        navigate('/admin'); // Redirect to Admin Dashboard
      } else {
        setError('You are not authorized to access the admin panel.');
      }
    } catch (err) {
      setError('Invalid admin credentials');
      console.error('Login error:', err);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Admin Login</h2>
        <p style={styles.subheading}>Sign in to GrowSmart Admin Panel</p>
        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button}>Sign In</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    background: 'linear-gradient(to bottom right, #d8b4a0, #f0e5dc)',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  heading: {
    fontSize: '24px',
    margin: '15px 0 5px 0',
  },
  subheading: {
    color: '#777',
    marginBottom: '20px',
  },
  inputGroup: {
    textAlign: 'left',
    marginBottom: '20px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    marginTop: '5px',
  },
  button: {
    backgroundColor: '#2e7d32',
    color: 'white',
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '10px',
  },
  error: {
    color: 'red',
    fontWeight: 500,
    marginBottom: '15px',
  },
};

export default AdminLogin;
