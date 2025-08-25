// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ Import LogWatering modal
import LogWatering from "./LogWatering";
import "../styles/LogWatering.css";

const Dashboard = () => {
  const [recentCrops, setRecentCrops] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [successRate, setSuccessRate] = useState(0);
  const [harvestCount, setHarvestCount] = useState(0);

  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  // Crop-specific care rules (basic, static for now)
  const cropCareRules = {
    tomato: { watering: { needs: 'high' }, fertilizing: { stage: 'flowering' }, pruning: { stage: 'growing' }, harvest: { stage: 'ready' } },
    spinach: { watering: { needs: 'medium' }, fertilizing: { stage: 'growing' }, pruning: null, harvest: { stage: 'ready' } },
    basil: { watering: { needs: 'low' }, fertilizing: { stage: 'growing' }, pruning: { stage: 'growing' }, harvest: { stage: 'ready' } }
  };

  // ✅ Generate static tasks for demo (no weather)
  const generateTasksForCrops = (crops) => {
    const today = new Date().toISOString().split('T')[0];
    const tasks = [];

    crops.forEach(crop => {
      const rules = cropCareRules[crop.name?.toLowerCase()];
      if (!rules) return;

      // Example: always suggest watering task
      tasks.push({
        id: `water-${crop.id}`,
        task: 'Watering',
        cropName: crop.name,
        type: 'watering',
        priority: 'medium',
        dueDate: today
      });
    });

    return tasks;
  };

  // ✅ Fetch crops and compute stats
  const fetchUserData = async (userId) => {
    try {
      // ✅ Fetch crops
      const cropsRef = query(collection(db, 'crops'), where('ownerId', '==', userId));
      const cropsSnap = await getDocs(cropsRef);
      const crops = cropsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setRecentCrops(crops);

      // ✅ Compute success rate & harvests
      const successfulStatuses = ["ready", "harvested", "healthy", "fruiting"];
      const harvested = crops.filter(c =>
        successfulStatuses.includes(c.status?.toLowerCase())
      );

      setHarvestCount(harvested.length);
      setSuccessRate(crops.length > 0 ? Math.round((harvested.length / crops.length) * 100) : 0);

      const smartTasks = generateTasksForCrops(crops);
      setUpcomingTasks(smartTasks);

      if (smartTasks.length > 0) {
        toast.info(`You have ${smartTasks.length} upcoming tasks!`, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } catch (err) {
      console.error('Firebase fetch error:', err);
    }
  };

  useEffect(() => {
    const fetchUserDataAndTasks = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        await fetchUserData(user.uid);
      } catch (err) {
        console.error('Error fetching user data or tasks:', err);
      }
    };
    fetchUserDataAndTasks();
  }, []);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'ready': return 'status-badge status-success';
      case 'harvested': return 'status-badge status-success';
      case 'healthy': return 'status-badge status-info';
      case 'fruiting': return 'status-badge status-info';
      case 'flowering': return 'status-badge status-info';
      case 'growing': return 'status-badge status-warning';
      default: return 'status-badge';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'status-badge status-error';
      case 'medium': return 'status-badge status-warning';
      case 'low': return 'status-badge status-info';
      default: return 'status-badge';
    }
  };

  return (
    <div className="dashboard">
      <ToastContainer />
      <div className="dashboard-header mb-lg">
        <h1>🌱 Welcome to GrowSmart</h1>
        <p>Your urban terrace garden management dashboard</p>
      </div>

      {/* Smart Task Reminders Card */}
      <div className="card mb-md">
        <ul className="text-base leading-relaxed">
          <li>▶ Auto-generated care tasks (watering, fertilizing, pruning, harvesting)</li>
          <li>▶ Crop-specific recommendations</li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 mb-lg">
        <div className="card text-center">
          <div className="stat-number">{recentCrops.length}</div>
          <div className="stat-label">Active Crops</div>
        </div>
        <div className="card text-center">
          <div className="stat-number">{upcomingTasks.length}</div>
          <div className="stat-label">Pending Tasks</div>
        </div>
        <div className="card text-center">
          <div className="stat-number">{harvestCount}</div>
          <div className="stat-label">This Month's Harvests</div>
        </div>
        <div className="card text-center">
          <div className="stat-number">{successRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      {/* Crops & Tasks */}
      <div className="grid grid-cols-2 gap-lg">
        {/* Crops */}
        <div className="card">
          <div className="flex justify-between items-center mb-md">
            <h2>Recent Crops</h2>
            <Link to="/crops" className="btn btn-outline">View All</Link>
          </div>
          <div className="crops-list">
            {recentCrops.length > 0 && (
              <div key={recentCrops[0].id} className="crop-item">
                <div className="crop-info">
                  <h4>{recentCrops[0].name}</h4>
                  <p className="crop-variety">{recentCrops[0].variety || "Normal"}</p>
                  <p className="crop-date">
                    Planted: {recentCrops[0].datePlanted ? new Date(recentCrops[0].datePlanted).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="crop-status">
                  <span className={getStatusBadgeClass(recentCrops[0].status)}>{recentCrops[0].status}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="card">
          <div className="flex justify-between items-center mb-md">
            <h2>Upcoming Tasks</h2>
            <Link to="/tasks" className="btn btn-outline">View All</Link>
          </div>
          <div className="tasks-list">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-info">
                  <h4>{task.task}</h4>
                  <p className="task-crop">For: {task.cropName}</p>
                  <p className="task-due">Due: {task.dueDate}</p>
                </div>
                <div className="task-priority">
                  <span className={getPriorityBadgeClass(task.priority)}>{task.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-lg">
        <h2>Quick Actions</h2>
        <div className="flex gap-md mt-md">
          <Link to="/add-crop" className="btn btn-primary">Add New Crop</Link>
          <Link to="/weather" className="btn btn-secondary">Check Weather</Link>
          <LogWatering />
          <button onClick={() => navigate('/add-photo')} className="btn btn-outline">📸 Add Photo</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
