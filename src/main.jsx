import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './input.css';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import PostJob from './pages/PostJob';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import StaticPage from './pages/StaticPage';

const protectedPage = (component) => <ProtectedRoute>{component}</ProtectedRoute>;
const router = createBrowserRouter([
  { path: '/', element: <Layout />, children: [
    { index: true, element: <Home /> },
    { path: 'login', element: <Login /> },
    { path: 'signup', element: <Signup /> },
    { path: 'jobs', element: <Jobs /> },
    { path: 'jobs/:id', element: <JobDetail /> },
    { path: 'post-job', element: protectedPage(<PostJob />) },
    { path: 'messages', element: protectedPage(<Messages />) },
    { path: 'profile', element: protectedPage(<Profile />) },
    { path: 'notifications', element: protectedPage(<Notifications />) },
    { path: 'admin', element: protectedPage(<Admin />) },
    ...['govt','community','companies','hangout','books','resume','reviews','connection','about'].map((slug) => ({ path: slug, element: <StaticPage slug={slug} /> })),
    { path: '*.html', element: <Navigate to="/" replace /> },
    { path: '*', element: <Navigate to="/" replace /> }
  ] }
], { basename: '/booterspace' });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider><RouterProvider router={router} /></AuthProvider>
  </React.StrictMode>
);
