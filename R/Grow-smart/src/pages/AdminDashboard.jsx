import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";


const AdminDashboard = () => {
  const [crops, setCrops] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cropsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "crops")),
        getDocs(collection(db, "users")),
      ]);

      const cropList = cropsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const userList = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setCrops(cropList);
      setUsers(userList);
    } catch (err) {
      console.error(err);
      setError("⚠️ Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (cropId) => {
    if (!window.confirm("Are you sure you want to delete this crop?")) return;
    try {
      await deleteDoc(doc(db, "crops", cropId));
      setCrops((prev) => prev.filter((c) => c.id !== cropId));
    } catch (err) {
      alert("Failed to delete crop.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/admin-login");
  };

  const getDaysPlanted = (datePlanted) => {
    const planted = new Date(datePlanted);
    const today = new Date();
    const diffTime = Math.abs(today - planted);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUserNameById = (userId) => {
    const user = users.find((u) => u.id === userId);
    return user ? `${user.name || "Unknown"} (${user.email || "no email"})` : userId;
  };

  const filteredCrops = crops.filter((crop) => {
    return (
      (filterStatus === "all" || crop.status === filterStatus) &&
      (selectedUser === "all" || crop.ownerId === selectedUser)
    );
  });

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>🛡️ Admin Dashboard</h1>
          <p>Manage crops & users efficiently</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {loading ? (
        <p className="text-gray">Loading admin data...</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : (
        <>
          {/* Users List */}
          <div className="user-list">
            <h2>👥 Registered Users</h2>
            <ul className="user-grid">
              {users.map((user) => (
                <li key={user.id} className="user-card">
                  <strong>{user.name || "No Name"}</strong>
                  <span> ({user.email || "No Email"})</span>
                  <br />
                  <small>UID: {user.id}</small>
                </li>
              ))}
            </ul>
          </div>

          {/* Filters */}
          <div className="filter-box">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="germinating">🌱 Germinating</option>
              <option value="growing">🌿 Growing</option>
              <option value="flowering">🌸 Flowering</option>
              <option value="fruiting">🍎 Fruiting</option>
              <option value="ready">✅ Ready</option>
            </select>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email || user.id}
                </option>
              ))}
            </select>
          </div>

          {/* Crops Grid */}
          <div className="crops-grid">
            {filteredCrops.map((crop) => (
              <div key={crop.id} className="crop-card">
                {/* Crop Image */}
                {crop.photoUrl && (
                  <img
                    src={crop.photoUrl}
                    alt={crop.name}
                    className="crop-image"
                    onClick={() => setSelectedImage(crop.photoUrl)}
                  />
                )}

                {/* Crop Details */}
                <div className="crop-details">
                  <div className="crop-header">
                    <h3>{crop.name}</h3>
                    <span className={`status-badge ${crop.status}`}>
                      {crop.status}
                    </span>
                  </div>
                  <p className="italic">{crop.variety}</p>

                  <div className="crop-meta">
                    <p>
                      👤 <strong>Owner:</strong> {getUserNameById(crop.ownerId)}
                    </p>
                    <p>
                      📅 <strong>Planted:</strong>{" "}
                      {new Date(crop.datePlanted).toLocaleDateString()} (
                      {getDaysPlanted(crop.datePlanted)} days ago)
                    </p>
                    <p>🪴 <strong>Container:</strong> {crop.containerSize}</p>
                    <p>☀️ <strong>Light:</strong> {crop.sunlightReq}</p>
                    <p>🌱 <strong>Source:</strong> {crop.source}</p>
                    {crop.notes && <p>📝 {crop.notes}</p>}
                  </div>

                  {/* Delete Button */}
                  <div className="crop-actions">
                    <button onClick={() => handleDelete(crop.id)} className="delete-btn">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal for Image Preview */}
      {selectedImage && (
        <div className="image-modal" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Preview" />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
