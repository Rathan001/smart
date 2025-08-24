// src/pages/CropCare.jsx
import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import Calendar from "react-calendar"; // ✅ install: npm install react-calendar
import "react-calendar/dist/Calendar.css";
import {
  OPENWEATHERMAP_API_KEY,
  OPENWEATHERMAP_CURRENT_URL,
  OPENWEATHERMAP_FORECAST_URL,
} from "../config/weather";

// ✅ Default crop care data
const cropCareData = {
  Carrots: { water: "500ml every 3 days", sunlight: "6h/day", care: "Loosen soil, weed regularly" },
  Radishes: { water: "400ml every 2 days", sunlight: "5–6h/day", care: "Thin seedlings, avoid overwatering" },
  "Green Onions": { water: "300ml daily", sunlight: "4–5h/day", care: "Fertilize every 2 weeks with NPK" },
  Mint: { water: "200ml daily", sunlight: "Partial shade (3–4h)", care: "Trim leaves, keep soil moist" },
  Cilantro: { water: "250ml daily", sunlight: "4–5h/day", care: "Harvest often, moist soil" },
  Parsley: { water: "300ml every 2 days", sunlight: "5–6h/day", care: "Fertilize monthly, avoid soggy soil" },
  Tomatoes: { water: "500ml every 2 days", sunlight: "6–8h/day", care: "Support with stakes, fertilize every 2 weeks" },
  Spinach: { water: "300ml every 2 days", sunlight: "4–5h/day", care: "Harvest outer leaves, avoid heat" },
  Herbs: { water: "200ml daily", sunlight: "Partial shade", care: "Trim often to promote growth" },
};

const CropCare = () => {
  const [weather, setWeather] = useState(null);
  const [forecastDays, setForecastDays] = useState([]);
  const [userCrops, setUserCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 🌦️ Fetch weather
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const [resCurrent, resForecast] = await Promise.all([
          fetch(`${OPENWEATHERMAP_CURRENT_URL}?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`),
          fetch(`${OPENWEATHERMAP_FORECAST_URL}?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`),
        ]);
        const currentData = await resCurrent.json();
        const forecastData = await resForecast.json();
        if (currentData.cod === 200) setWeather(currentData);

        if (forecastData.cod === "200") {
          const days = {};
          forecastData.list.forEach((entry) => {
            const date = new Date(entry.dt_txt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            if (!days[date]) {
              days[date] = { temps: [], humidity: [], conditions: [] };
            }
            days[date].temps.push(entry.main.temp);
            days[date].humidity.push(entry.main.humidity);
            days[date].conditions.push(entry.weather[0].main.toLowerCase());
          });

          const dailyForecasts = Object.entries(days)
            .slice(0, 3)
            .map(([date, vals]) => ({
              date,
              avgTemp: Math.round(vals.temps.reduce((a, b) => a + b, 0) / vals.temps.length),
              avgHumidity: Math.round(vals.humidity.reduce((a, b) => a + b, 0) / vals.humidity.length),
              condition: vals.conditions.sort((a, b) =>
                vals.conditions.filter((v) => v === a).length - vals.conditions.filter((v) => v === b).length
              ).pop(),
            }));

          setForecastDays(dailyForecasts);
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
      }
    });
  }, []);

  // 🌱 Fetch user crops
  useEffect(() => {
    const fetchCrops = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(collection(db, "crops"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        const crops = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setUserCrops(crops);

        // 📅 Generate calendar tasks
        const tasks = [];
        crops.forEach((crop) => {
          const care = cropCareData[crop.name] || { water: "Custom", care: "Monitor growth" };
          const plantDate = new Date(crop.datePlanted);
          tasks.push({
            date: new Date(plantDate.getTime() + 3 * 24 * 60 * 60 * 1000),
            task: `💧 Water ${crop.name} (${care.water})`,
          });
          tasks.push({
            date: new Date(plantDate.getTime() + 14 * 24 * 60 * 60 * 1000),
            task: `🌱 Fertilize ${crop.name}`,
          });
        });
        setCalendarTasks(tasks);
      } catch (err) {
        console.error("Error fetching crops:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCrops();
  }, []);

  // 📅 Get tasks for selected date
  const getTasksForDate = (date) => {
    return calendarTasks.filter(
      (task) =>
        new Date(task.date).toDateString() === new Date(date).toDateString()
    );
  };

  if (loading) return <p className="text-center text-lg">Loading crop care data...</p>;

  return (
    <div className="crop-care-page p-8 bg-gradient-to-br from-green-100 via-green-50 to-white min-h-screen fade-in">
      <h1 className="text-4xl font-bold text-green-900 text-center mb-8 drop-shadow-md section-title">
        🌱 Smart Crop Care Dashboard
      </h1>

      {/* Weather */}
      {weather && (
        <div className="weather-card max-w-4xl mx-auto mb-8 fade-in">
          <h2 className="section-title">Current Weather</h2>
          <div className="flex justify-between text-lg">
            <p>🌡️ Temp: {weather.main?.temp}°C</p>
            <p>💧 Humidity: {weather.main?.humidity}%</p>
            <p>☁️ {weather.weather?.[0]?.description}</p>
          </div>
        </div>
      )}

      {/* Forecast */}
      <div className="max-w-6xl mx-auto mb-10 fade-in">
        <h2 className="section-title text-center">📅 3-Day Forecast</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {forecastDays.map((day, idx) => (
            <div key={idx} className="forecast-card">
              <h3>{day.date}</h3>
              <p>🌡️ {day.avgTemp}°C</p>
              <p>💧 {day.avgHumidity}% humidity</p>
              <p>☁️ {day.condition}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User Crops & Care */}
      <h2 className="section-title text-center">🌾 Your Crops & Care Tips</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 fade-in">
        {userCrops.map((crop) =>
          forecastDays.map((day, idx) => {
            const suggestion = cropCareData[crop.name] || { water: "Custom", sunlight: "4–6h", care: "Monitor growth" };
            return (
              <div key={`${crop.id}-${idx}`} className="crop-card">
                <h3>{crop.name} – {day.date}</h3>
                <p>Planted: {crop.datePlanted || "N/A"}</p>
                <p>Container: {crop.containerSize || "N/A"}</p>
                <div className="mt-2 text-base">
                  <p><strong>💧 Watering:</strong> {suggestion.water}</p>
                  <p><strong>☀️ Sunlight:</strong> {suggestion.sunlight}</p>
                  <p><strong>🌱 Care:</strong> {suggestion.care}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 📅 Calendar View */}
      <div className="calendar-card max-w-4xl mx-auto mb-8 fade-in">
        <h2 className="section-title">📌 Crop Care Calendar</h2>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          className="rounded-lg shadow-md p-3"
        />
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-green-700">
            Tasks for {selectedDate.toDateString()}:
          </h3>
          <ul className="list-disc list-inside text-gray-700">
            {getTasksForDate(selectedDate).length > 0 ? (
              getTasksForDate(selectedDate).map((task, idx) => (
                <li key={idx}>{task.task}</li>
              ))
            ) : (
              <p className="text-gray-500">No tasks today.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CropCare;
