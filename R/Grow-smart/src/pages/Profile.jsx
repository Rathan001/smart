// FILE: /components/Profile.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import "../styles/ProfileDashboard.css";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [cropHistory, setCropHistory] = useState([]);
  const [seasonalData, setSeasonalData] = useState({
    springSummer: 0,
    fallWinter: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const cropsRef = collection(db, "users", user.uid, "crops");
        const crops = await getDocs(cropsRef);
        const cropData = crops.docs.map((doc) => doc.data());

        const springSummer = cropData.filter(
          (crop) => crop.season === "Spring/Summer"
        ).length;
        const fallWinter = cropData.filter(
          (crop) => crop.season === "Fall/Winter"
        ).length;

        setUserData({
          email: user.email,
          displayName: user.displayName || "Anonymous",
        });
        setCropHistory(cropData);
        setSeasonalData({ springSummer, fallWinter });
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) return <p className="loading">Loading...</p>;

  const chartData = [
    { season: "Spring/Summer", count: seasonalData.springSummer },
    { season: "Fall/Winter", count: seasonalData.fallWinter },
  ];

  return (
    <motion.div
      className="container"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="page-title">User Profile Dashboard</h2>

      {/* Profile Info */}
      {userData && (
        <motion.div
          className="profile-card"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <p>
            <strong>Email:</strong> {userData?.email}
          </p>
          <p>
            <strong>Name:</strong> {userData?.displayName}
          </p>
          <p>
            <strong>Total Crops:</strong> {cropHistory.length}
          </p>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </motion.div>
      )}

      {/* Crop History */}
      <h3>Crop History</h3>
      {cropHistory.length > 0 ? (
        <ul className="crop-history">
          {cropHistory.map((crop, index) => (
            <motion.li
              key={index}
              className="crop-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="crop-details">
                <span>
                  <strong>{crop.name}</strong> – Planted on {crop.datePlanted} (
                  {crop.season})
                </span>
                {crop.photoUrl && (
                  <img
                    src={crop.photoUrl}
                    alt={crop.name}
                    className="crop-photo"
                  />
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p>No crops added yet.</p>
      )}

      {/* Seasonal Data Chart */}
      <h3>Seasonal Data Comparison</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="season" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4caf50" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Reminders Section */}
      <h3>Reminders</h3>
      <div className="reminders">
        <p>
          Stay on top of your farming tasks! Add reminders for watering,
          fertilizing, and harvesting.
        </p>
        <button className="add-reminder-btn">+ Add Reminder</button>
      </div>

      {/* Growth Visualization */}
      <h3>Growth Visualization</h3>
      <div className="growth-visualization">
        <p>
          Watch your crop growth trends over time with interactive charts (coming
          soon).
        </p>
      </div>
    </motion.div>
  );
};

export default Profile;
