import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import "../styles/Tasks.css";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Tasks() {
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [reminderTasks, setReminderTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [toastQueue, setToastQueue] = useState([]); // for popup toasts
  const [loading, setLoading] = useState(true);

  const OPENWEATHERMAP_API_KEY = "473ebbd3153406298c57634962adefc6";
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchTasks();
        fetchWeatherAndUpdateTasks();
        fetchCropReminders(); // ✅ fetch crop-based reminders
      }
    });

    return () => unsubscribe();
  }, []);

  // Toast popup handler
  const showToast = (message) => {
    const id = Date.now();
    setToastQueue((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const pushNotification = (title, message, icon) => {
    // Add to UI
    setNotifications((prev) => [...prev, { id: Date.now(), message }]);

    // Show toast
    showToast(message);

    // Browser notification
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: message,
        icon: icon,
      });
    }
  };

  // ✅ Fetch crop-based reminders
  const fetchCropReminders = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cropsQuery = query(
        collection(db, "crops"),
        where("ownerId", "==", user.uid)
      );
      const snap = await getDocs(cropsQuery);

      snap.docs.forEach((docSnap) => {
        const crop = docSnap.data();
        const today = new Date();
        const planted = new Date(crop.datePlanted);
        const diffDays = Math.floor(
          (today - planted) / (1000 * 60 * 60 * 24)
        );

        // Watering schedule
        if (
          crop.wateringFrequency &&
          diffDays % parseInt(crop.wateringFrequency) === 0
        ) {
          const msg = `💧 Water your ${crop.name} today (every ${crop.wateringFrequency} day(s))`;
          pushNotification(
            "Crop Reminder 🌱",
            msg,
            "https://cdn-icons-png.flaticon.com/512/616/616408.png"
          );
        }

        // Fertilizing schedule
        if (
          crop.fertilizingFrequency &&
          diffDays % parseInt(crop.fertilizingFrequency) === 0
        ) {
          const msg = `🌱 Fertilize your ${crop.name} today (every ${crop.fertilizingFrequency} day(s))`;
          pushNotification(
            "Crop Reminder 🌱",
            msg,
            "https://cdn-icons-png.flaticon.com/512/2900/2900521.png"
          );
        }
      });
    } catch (error) {
      console.error("Error fetching crop reminders:", error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setUpcomingTasks([]);
      setReminderTasks([]);
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const allQuery = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(allQuery);

      const allTasks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      allTasks.sort((a, b) =>
        a.dueDate && b.dueDate ? new Date(a.dueDate) - new Date(b.dueDate) : 0
      );

      const upcoming = allTasks.filter(
        (task) =>
          (!task.completed && task.status === "upcoming") ||
          (!task.completed && !task.status && task.type !== "reminder")
      );

      const reminder = allTasks.filter(
        (task) =>
          task.status === "reminder" ||
          task.type === "watering" ||
          task.type === "fertilizing"
      );

      const notificationsList = allTasks.map((task) => ({
        id: task.id,
        message: `${task.task} - ${
          task.dueDate ? `Due: ${task.dueDate}` : "No due date"
        }`,
      }));

      setUpcomingTasks(upcoming);
      setReminderTasks(reminder);
      setNotifications(notificationsList);

      allTasks.forEach((task) => {
        const msg = `${task.task} ${
          task.dueDate ? `(Due: ${task.dueDate})` : ""
        }`;
        showToast(msg);

        if (Notification.permission === "granted") {
          new Notification("📌 Task Reminder", {
            body: msg,
            icon: "https://cdn-icons-png.flaticon.com/512/942/942751.png",
          });
        }
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }

    setLoading(false);
  };

  const fetchWeatherAndUpdateTasks = async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
          );
          const data = await response.json();
          setWeatherData(data);

          const weatherCondition = data.weather[0].main.toLowerCase();
          const rainExpected = weatherCondition.includes("rain");

          if (rainExpected) {
            const message = "🌧️ Rain expected. Skip watering tasks.";
            pushNotification(
              "Garden Reminder",
              message,
              "https://cdn-icons-png.flaticon.com/512/1163/1163624.png"
            );

            const user = auth.currentUser;
            if (user) {
              const wateringTasksQuery = query(
                collection(db, "tasks"),
                where("userId", "==", user.uid),
                where("type", "==", "watering")
              );
              const snap = await getDocs(wateringTasksQuery);
              snap.docs.forEach(async (docSnap) => {
                await deleteDoc(docSnap.ref);
              });
              fetchTasks();
            }
          }
        } catch (error) {
          console.error("Error fetching weather data:", error);
        }
      },
      (error) => console.error("Error getting location:", error)
    );
  };

  const handleAddTask = async () => {
    const user = auth.currentUser;
    if (!user || !newTask.trim()) return;

    await addDoc(collection(db, "tasks"), {
      userId: user.uid,
      task: newTask,
      status: "upcoming",
      priority: "Medium",
      completed: false,
      createdAt: serverTimestamp(),
    });

    setNewTask("");
    fetchTasks();
  };

  const handleDeleteTask = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));
    fetchTasks();
  };

  const renderTaskList = (tasks, title, cardClass, statusClass) => (
    <div>
      <h2 className="section-title">{title}</h2>
      {tasks.length === 0 ? (
        <p className="no-tasks-text">No {title.toLowerCase()} yet.</p>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div key={task.id} className={`task-card ${cardClass}`}>
              <div>
                <p className="task-name">{task.task}</p>
                {task.priority && (
                  <p className="task-priority">
                    Priority: <span>{task.priority}</span>
                  </p>
                )}
                {task.dueDate && (
                  <p className="task-date">Due: {task.dueDate}</p>
                )}
                {task.status && (
                  <p className="task-status">
                    Status: <span className={statusClass}>{task.status}</span>
                  </p>
                )}
                {!task.status && task.type && (
                  <p className="task-status">
                    Type: <span>{task.type}</span>
                  </p>
                )}
              </div>
              <button
                className="task-delete-btn"
                onClick={() => handleDeleteTask(task.id)}
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="tasks-container">
      <h1 className="tasks-title">🌱 Upcoming & Reminder Tasks</h1>

      {/* Toast Popup */}
      <div className="toast-container">
        {toastQueue.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>

      {/* Notifications Section */}
      <div className="notifications">
        <h2 className="section-title">Notifications</h2>
        {notifications.length === 0 ? (
          <p className="no-tasks-text">No notifications yet.</p>
        ) : (
          <ul className="notifications-list">
            {notifications.map((notification) => (
              <li key={notification.id} className="notification-item">
                {notification.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="task-input-container">
        <input
          type="text"
          className="task-input"
          placeholder="Enter new task..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button className="task-add-btn" onClick={handleAddTask}>
          Add
        </button>
      </div>

      {loading ? (
        <p className="loading-text">Loading tasks...</p>
      ) : (
        <>
          {renderTaskList(upcomingTasks, "Upcoming Tasks", "", "status-upcoming")}
          {renderTaskList(
            reminderTasks,
            "Reminder Tasks",
            "reminder-card",
            "status-reminder"
          )}
        </>
      )}
    </div>
  );
}
