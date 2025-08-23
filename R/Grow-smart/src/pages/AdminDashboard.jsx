// src/pages/AdminDashboard.jsx

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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "ready":
        return "bg-green-500 text-white";
      case "flowering":
        return "bg-pink-500 text-white";
      case "fruiting":
        return "bg-purple-500 text-white";
      case "growing":
        return "bg-yellow-500 text-black";
      case "germinating":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
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
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-700">🛡️ Admin Dashboard</h1>
          <p className="text-gray-600">Manage crops & users efficiently</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition"
        >
          Logout
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading admin data...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          {/* Users List */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-3">👥 Registered Users</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="p-3 border rounded-md bg-gray-100 hover:shadow-md transition"
                >
                  <strong>{user.name || "No Name"}</strong>
                  <span className="text-sm text-gray-600">
                    {" "}
                    ({user.email || "No Email"})
                  </span>
                  <br />
                  <small className="text-gray-500">UID: {user.id}</small>
                </li>
              ))}
            </ul>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border rounded-md shadow-sm"
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
              className="p-2 border rounded-md shadow-sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCrops.map((crop) => (
              <div
                key={crop.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-1"
              >
                {/* Crop Image */}
                {crop.photoUrl && (
                  <img
                    src={crop.photoUrl}
                    alt={crop.name}
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-90"
                    onClick={() => setSelectedImage(crop.photoUrl)}
                  />
                )}

                {/* Crop Details */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{crop.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-md ${getStatusBadgeClass(
                        crop.status
                      )}`}
                    >
                      {crop.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 italic">{crop.variety}</p>

                  <div className="mt-3 text-sm text-gray-700 space-y-1">
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
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleDelete(crop.id)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm shadow"
                    >
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
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-2xl max-h-[80vh] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
