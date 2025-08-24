// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ Import LogWatering modal
import LogWatering from "./LogWatering";
import "../styles/LogWatering.css";

const Dashboard = () => {
  const [recentCrops, setRecentCrops] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [rainExpected, setRainExpected] = useState(false);
  const [rescheduledWateringCount, setRescheduledWateringCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [harvestCount, setHarvestCount] = useState(0);

  const db = getFirestore();
  const auth = getAuth();
  const navigate = useNavigate();

  // Crop-specific care rules
  const cropCareRules = {
    tomato: { watering: { needs: 'high' }, fertilizing: { stage: 'flowering' }, pruning: { stage: 'growing' }, harvest: { stage: 'ready' } },
    spinach: { watering: { needs: 'medium' }, fertilizing: { stage: 'growing' }, pruning: null, harvest: { stage: 'ready' } },
    basil: { watering: { needs: 'low' }, fertilizing: { stage: 'growing' }, pruning: { stage: 'growing' }, harvest: { stage: 'ready' } }
  };

  // Fetch current weather
  const fetchWeatherData = async () => {
    try {
      const proxy = 'https://api.allorigins.win/get?url=';
      const target = encodeURIComponent(
        'https://api.weatherapi.com/v1/current.json?key=473ebbd3153406298c57634962adefc6&q=Delhi'
      );
      const response = await fetch(`${proxy}${target}`);
      const result = await response.json();
      const data = JSON.parse(result.contents);

      setWeatherData(data);
      const isRainy = data.current?.condition?.text?.toLowerCase()?.includes('rain');
      setRainExpected(isRainy);
      return data;
    } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
    }
  };

  // Smart task generation
  const generateTasksForCrops = (crops, weather) => {
    const today = new Date().toISOString().split('T')[0];
    const tasks = [];
    const isRaining = weather.current?.condition?.text?.toLowerCase()?.includes('rain');
    const temp = weather.current?.temp_c || 0;
    const humidity = weather.current?.humidity || 0;

    crops.forEach(crop => {
      const rules = cropCareRules[crop.name?.toLowerCase()];
      if (!rules) return;

      // WATERING
      if (!isRaining) {
        if (
          (rules.watering.needs === 'high' && humidity < 80) ||
          (rules.watering.needs === 'medium' && humidity < 70) ||
          (rules.watering.needs === 'low' && humidity < 50)
        ) {
          tasks.push({
            id: `water-${crop.id}`,
            task: 'Watering',
            cropName: crop.name,
            type: 'watering',
            priority: temp > 30 ? 'high' : 'medium',
            dueDate: today
          });
        }
      }
    });

    return tasks;
  };

  // Apply weather-aware scheduling
  const filterTasksByWeather = (tasks) => {
    if (!weatherData) return tasks;
    const isRainy = weatherData.current?.condition?.text?.toLowerCase()?.includes('rain');
    const adjusted = [];
    let rescheduledCount = 0;

    for (const task of tasks) {
      if ((task.type === 'watering' || task.type === 'fertilizing') && isRainy) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        adjusted.push({
          ...task,
          dueDate: tomorrow.toISOString().split('T')[0],
          rescheduled: true,
        });
        rescheduledCount++;
      } else {
        adjusted.push(task);
      }
    }
    setRescheduledWateringCount(rescheduledCount);
    return adjusted;
  };

  // Fetch crops and generate tasks
  const fetchUserData = async (userId) => {
    try {
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

      const weather = await fetchWeatherData();
      if (!weather) return;

      const smartTasks = generateTasksForCrops(crops, weather);
      const adjustedTasks = filterTasksByWeather(smartTasks);
      setUpcomingTasks(adjustedTasks);

      if (adjustedTasks.length > 0) {
        toast.info(`You have ${adjustedTasks.length} upcoming tasks!`, {
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
          <li>▶ Weather-Aware Scheduling</li>
          <li>▶ Crop-specific recommendations</li>
        </ul>
      </div>

      {rainExpected && rescheduledWateringCount > 0 && (
        <div className="alert alert-warning mb-md">
          <strong>{rescheduledWateringCount}</strong> watering task(s) rescheduled to tomorrow due to expected rain.
        </div>
      )}

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
                  {task.rescheduled && (
                    <p className="text-xs text-yellow-700">Rescheduled due to rain</p>
                  )}
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
