// src/App.jsx
import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './Components/Layout';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CropLibrary from './pages/CropLibrary';
import AddCrop from './pages/AddCrop';
import Login from './pages/Login'; 
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './Components/auth/ProtectedRoute';
import AdminRoute from './Components/auth/AdminRoute';
import { AuthProvider, AuthContext } from './Components/auth/AuthContext';
import Weather from './pages/weather';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';
import AddPhoto from './pages/AddPhoto';
import CropDetails from './pages/CropDetails';
import CropCare from "./pages/CropCare";

// Initialize react-query client
const queryClient = new QueryClient();

// ✅ Component to handle default redirect
const DefaultRoute = () => {
  const { currentUser } = useContext(AuthContext);

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Default route with redirect */}
            <Route path="/" element={<DefaultRoute />} />

            {/* Public routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Admin routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Protected routes for normal users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crops" element={<CropLibrary />} />
              <Route path="/add-crop" element={<AddCrop />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/add-photo" element={<AddPhoto />} />
              <Route path="/crop/:id" element={<CropDetails />} />
              <Route path="/weather" element={<Weather />} />
              <Route path="/crop-care" element={<CropCare />} />
            </Route>
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
    <ToastContainer />
  </QueryClientProvider>
);

export default App;
