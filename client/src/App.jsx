import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

// Components
import Navbar from './components/layout/Navbar';
import Landing from './components/layout/Landing';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import Profile from './components/auth/Profile';
import Dashboard from './components/dashboard/Dashboard';
import GroupDetail from './components/groups/GroupDetail';
import CreateGroup from './components/groups/CreateGroup';
import AddExpense from './components/expenses/AddExpense';
import SettlementPlan from './components/expenses/SettlementPlan';
import ExpenseAnalysis from './components/expenses/ExpenseAnalysis';
import NotificationManager from './components/layout/NotificationManager';

// Context
import AuthContext from './context/AuthContext';

// Set default axios base URL
axios.defaults.baseURL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Setup socket connection
  useEffect(() => {
    // Create socket instance only once
    const socketInstance = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false, // Don't connect automatically
      transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
    });

    // Set up socket connection and error handling
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);

      // Attempt to reconnect if not closed intentionally
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    setSocket(socketInstance);

    // Cleanup socket connection
    return () => {
      if (socketInstance) {
        console.log('Disconnecting socket');
        socketInstance.disconnect();
      }
    };
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        // Set auth token header
        axios.defaults.headers.common['x-auth-token'] = token;

        try {
          const res = await axios.get('/users/profile');
          setUser(res.data);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Error loading user:', err);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['x-auth-token'];
        }
      }

      setLoading(false);
    };

    loadUser();
  }, []); // Empty dependency array to run only once

  // Connect or disconnect socket based on authentication state
  useEffect(() => {
    if (socket) {
      if (isAuthenticated && !socket.connected) {
        console.log('Connecting socket due to authentication');
        // Add a small delay to ensure proper connection
        setTimeout(() => {
          socket.connect();
        }, 100);
      } else if (!isAuthenticated && socket.connected) {
        console.log('Disconnecting socket due to logout');
        socket.disconnect();
      }
    }
  }, [isAuthenticated, socket]);

  // Private route component
  const PrivateRoute = ({ children }) => {
    if (loading) return <div>Loading...</div>;
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, setUser, setIsAuthenticated, socket }}>
      <Router>
        <div className="App">
          <Navbar />
          <NotificationManager />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/groups/create" element={
              <PrivateRoute>
                <CreateGroup />
              </PrivateRoute>
            } />
            <Route path="/groups/:id" element={
              <PrivateRoute>
                <GroupDetail />
              </PrivateRoute>
            } />
            <Route path="/expenses/add/:groupId" element={
              <PrivateRoute>
                <AddExpense />
              </PrivateRoute>
            } />
            <Route path="/expenses/settlement/:groupId" element={
              <PrivateRoute>
                <SettlementPlan />
              </PrivateRoute>
            } />
            <Route path="/expenses/analysis/:groupId" element={
              <PrivateRoute>
                <ExpenseAnalysis />
              </PrivateRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
