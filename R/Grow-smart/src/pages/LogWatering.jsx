// src/pages/LogWatering.jsx
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  OPENWEATHERMAP_API_KEY,
  OPENWEATHERMAP_CURRENT_URL,
} from "../config/weather";
import "../styles/LogWatering.css";

const amountChips = ["250 ml", "300 ml", "500 ml", "750 ml", "1 L"];

const LogWatering = () => {
  const auth = getAuth();
  const db = getFirestore();

  const [open, setOpen] = useState(false);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [customCrop, setCustomCrop] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [weather, setWeather] = useState(null);
  const [weatherAdvice, setWeatherAdvice] = useState({ msg: "" });
  const [msg, setMsg] = useState(null);

  // fetch crops from Firestore
  const fetchCrops = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const byUser = query(collection(db, "crops"), where("userId", "==", user.uid));
      const byOwner = query(collection(db, "crops"), where("ownerId", "==", user.uid));
      const [s1, s2] = await Promise.all([getDocs(byUser), getDocs(byOwner)]);
      const arr = [...s1.docs, ...s2.docs].map((d) => ({ id: d.id, ...d.data() }));
      const map = new Map(arr.map((c) => [c.id, c]));
      setCrops([...map.values()]);
    } catch (e) {
      console.error("Crops error:", e);
    }
  };

  // fetch weather
  const fetchWeather = async () => {
    try {
      const pos = await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve({ coords: { latitude: 12.97, longitude: 77.59 } })
        )
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `${OPENWEATHERMAP_CURRENT_URL}?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
      );
      const current = await res.json();
      setWeather(current);

      let advice = "";
      if (current.main?.temp > 32) advice = "🔥 Hot day – add ~200ml more.";
      if (current.main?.humidity < 40) advice += " 💧 Low humidity – keep soil moist.";
      if (current.weather?.[0]?.main === "Rain") advice += " 🌧 Rain expected – reduce watering.";

      setWeatherAdvice({ msg: advice });
    } catch (e) {
      console.error("Weather error:", e);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCrops();
      fetchWeather();
    }
  }, [open]);

  // handle save
  const handleSave = async () => {
    const cropName = customCrop || selectedCrop;
    if (!cropName) {
      setMsg({ type: "error", text: "⚠️ Please select or enter a crop." });
      return;
    }
    if (!amount) {
      setMsg({ type: "error", text: "⚠️ Please specify the water amount." });
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      const when = new Date(`${date}T${time}:00`);
      const logData = {
        userId: user?.uid,
        crop: cropName,
        amount,
        dateTime: when.toISOString(),
        notes,
        photoUrl,
        weatherMsg: weatherAdvice.msg,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "wateringLogs"), logData);

      setMsg({ type: "success", text: "✅ Watering log saved!" });

      // reset fields
      setSelectedCrop("");
      setCustomCrop("");
      setAmount("");
      setNotes("");
      setPhotoUrl("");
      setPhotoFile(null);

      setTimeout(() => setOpen(false), 1200);
    } catch (e) {
      console.error("Save error:", e);
      setMsg({ type: "error", text: "❌ Error saving log. Try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="gs-btn gs-btn-primary" onClick={() => setOpen(true)}>
        + Log Watering
      </button>

      {open && (
        <div className="lw-overlay" onClick={() => setOpen(false)}>
          <div className="lw-card" onClick={(e) => e.stopPropagation()}>
            <div className="lw-header">
              <h2>Log Watering</h2>
              <button className="lw-close" onClick={() => setOpen(false)}>×</button>
            </div>

            {msg && (
              <div className={`lw-msg ${msg.type}`}>
                {msg.text}
              </div>
            )}

            {/* Weather summary */}
            {weather && (
              <div className="lw-weather-box">
                <p>
                  🌡 {Math.round(weather.main?.temp)}°C • 💧 {weather.main?.humidity}% • {weather.weather?.[0]?.main}
                </p>
                {weatherAdvice.msg && <div className="lw-alert">{weatherAdvice.msg}</div>}
              </div>
            )}

            {/* Crop selection */}
            <div className="lw-field">
              <label>🌱 Select or Enter Crop</label>
              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value);
                  setCustomCrop("");
                }}
              >
                <option value="">-- Choose Existing --</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <span className="lw-or">OR</span>
              <input
                type="text"
                placeholder="Type crop name..."
                value={customCrop}
                onChange={(e) => {
                  setCustomCrop(e.target.value);
                  setSelectedCrop("");
                }}
              />
            </div>

            {/* Date & Time */}
            <div className="lw-grid">
              <div className="lw-field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="lw-field">
                <label>Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            {/* Amount */}
            <div className="lw-field">
              <label>💧 Water Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 300 ml"
              />
              <div className="lw-chips">
                {amountChips.map((v) => (
                  <button
                    key={v}
                    className={amount === v ? "active" : ""}
                    onClick={() => setAmount(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="lw-field">
              <label>📝 Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Soil was dry"
              />
            </div>

            {/* Photo */}
            <div className="lw-field">
              <label>📷 Photo</label>
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Paste image link"
              />
              <div
                className="lw-dropzone"
                onDrop={(e) => {
                  e.preventDefault();
                  setPhotoFile(e.dataTransfer.files[0]);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                {photoFile ? (
                  <span>📂 {photoFile.name}</span>
                ) : (
                  <span>Drag & drop a photo here</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="lw-actions">
              <button className="gs-btn gs-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="gs-btn gs-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LogWatering;
