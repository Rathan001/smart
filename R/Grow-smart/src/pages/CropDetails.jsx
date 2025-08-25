// src/pages/CropDetails.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import axios from "axios";

const CropDetails = () => {
  const { id } = useParams();
  const [crop, setCrop] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newEvent, setNewEvent] = useState({ type: "", date: "", notes: "" });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  const auth = getAuth();
  const db = getFirestore();

  // Cloudinary
  const CLOUD_NAME = "doosftwev";
  const UPLOAD_PRESET = "crop_photos";

  const eventTypes = ["Germination", "Flowering", "Fruit Set", "Harvest"];

  // 🔹 Real-time listeners for crop, timeline, and photos
  useEffect(() => {
    const cropRef = doc(db, "crops", id);
    const unsubCrop = onSnapshot(cropRef, (snap) => {
      if (snap.exists()) {
        setCrop({ id: snap.id, ...snap.data() });
      }
    });

    const timelineRef = collection(db, "crops", id, "growthTimeline");
    const unsubTimeline = onSnapshot(timelineRef, (snapshot) => {
      const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTimeline(events);
    });

    const photosRef = collection(db, "crops", id, "photos");
    const q = query(photosRef, orderBy("createdAt", "desc"));
    const unsubPhotos = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPhotos(list);
    });

    return () => {
      unsubCrop();
      unsubTimeline();
      unsubPhotos();
    };
  }, [id, db]);

  // Auto status update based on event
  const getStatusFromEvent = (eventType) => {
    switch (eventType) {
      case "Germination":
        return "germinating";
      case "Flowering":
        return "flowering";
      case "Fruit Set":
        return "fruiting";
      case "Harvest":
        return "ready";
      default:
        return crop?.status || "growing";
    }
  };

  // Add growth event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) return;

      const when = new Date(newEvent.date);
      const eventData = {
        type: newEvent.type,
        date: when.toISOString(),
        notes: newEvent.notes,
        photos: [],
        ownerId: user.uid,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "crops", id, "growthTimeline"), eventData);

      const newStatus = getStatusFromEvent(newEvent.type);
      await updateDoc(doc(db, "crops", id), {
        status: newStatus,
        lastUpdated: serverTimestamp(),
      });

      setNewEvent({ type: "", date: "", notes: "" });
      setShowAddEvent(false);
    } catch (e) {
      console.error("Error adding event:", e);
    }
  };

  // ✅ Photo Upload → Save in both crop-specific & global gallery
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        formData,
        {
          onUploadProgress: (pe) => {
            const percent = Math.round((pe.loaded * 100) / pe.total);
            setProgress(percent);
          },
        }
      );

      const downloadURL = res.data.secure_url;
      const publicId = res.data.public_id;
      const user = auth.currentUser;

      // Save inside crop-specific photos
      await addDoc(collection(db, "crops", id, "photos"), {
        url: downloadURL,
        publicId,
        createdAt: serverTimestamp(),
        userId: user?.uid || "unknown",
        ownerId: user?.uid || "unknown", 
      });

      // Save also to global gallery
      await addDoc(collection(db, "photos"), {
        url: downloadURL,
        publicId,
        createdAt: serverTimestamp(),
        userId: user?.uid || "unknown",
        ownerId: user?.uid || "unknown", 
        cropId: id,
        cropName: crop?.name || "Unknown Crop",
        cropType: crop?.variety || "Unknown Type",
      });

      setSuccess("✅ Photo uploaded");
      setPreview(null);
    } catch (err) {
      console.error("Upload error:", err);
      setError("❌ Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await deleteDoc(doc(db, "crops", id, "photos", photoId));
      setSuccess("✅ Photo deleted");
    } catch (err) {
      console.error("Delete error:", err);
      setError("❌ Failed to delete photo.");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "ready":
        return "status-badge status-success";
      case "flowering":
        return "status-badge status-info";
      case "fruiting":
        return "status-badge status-success";
      case "germinating":
        return "status-badge status-info";
      case "growing":
        return "status-badge status-warning";
      default:
        return "status-badge";
    }
  };

  const getDaysPlanted = () => {
    if (!crop?.datePlanted) return 0;
    const planted = new Date(crop.datePlanted);
    const today = new Date();
    const diffTime = Math.abs(today - planted);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!crop) return <div className="loading">Loading crop details...</div>;

  return (
    <div className="crop-details">
      {/* Header */}
      <div className="page-header mb-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1>{crop.name}</h1>
            <p className="crop-variety">{crop.variety}</p>
          </div>
          <div className="header-actions">
            <span className={getStatusBadgeClass(crop.status)}>{crop.status}</span>
            <button className="btn btn-outline ml-sm">Edit Crop</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-lg">
        {/* Crop Info */}
        <div className="col-span-1">
          <div className="card crop-info">
            <h2>Crop Information</h2>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Date Planted:</span>
                <span className="info-value">
                  {new Date(crop.datePlanted).toLocaleDateString()}
                  <br />
                  <small>({getDaysPlanted()} days ago)</small>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Container:</span>
                <span className="info-value">{crop.containerSize}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Sunlight:</span>
                <span className="info-value">{crop.sunlightReq}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Source:</span>
                <span className="info-value">{crop.source}</span>
              </div>
              {crop.location && (
                <div className="info-item">
                  <span className="info-label">Location:</span>
                  <span className="info-value">{crop.location}</span>
                </div>
              )}
            </div>

            {crop.notes && (
              <div className="crop-notes">
                <h3>Notes</h3>
                <p>{crop.notes}</p>
              </div>
            )}

            {/* ✅ Photo Upload Section */}
            <div className="mt-md">
              <h3>Crop Photos</h3>
              <button
                onClick={() => fileInputRef.current.click()}
                className="btn btn-primary mt-sm"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Choose Photo"}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              {preview && <img src={preview} alt="Preview" className="mt-sm rounded" />}
              {progress > 0 && (
                <div className="w-full bg-gray-200 rounded-full mt-sm">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              )}
              {success && <p className="text-green-600">{success}</p>}
              {error && <p className="text-red-600">{error}</p>}

              {/* ✅ Gallery */}
              <div className="grid grid-cols-3 gap-2 mt-md">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    <img
                      src={p.url}
                      alt="crop"
                      className="w-full h-20 object-cover rounded cursor-pointer"
                      onClick={() => setSelected(p.url)}
                    />
                    <button
                      className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => handleDeletePhoto(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Growth Timeline */}
        <div className="col-span-2">
          <div className="card timeline-section">
            <div className="flex justify-between items-center mb-md">
              <h2>Growth Timeline</h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddEvent(!showAddEvent)}
              >
                + Add Event
              </button>
            </div>

            {showAddEvent && (
              <form onSubmit={handleAddEvent} className="add-event-form mb-lg">
                <div className="form-row">
                  <div className="input-group">
                    <label className="input-label">Event Type</label>
                    <select
                      className="input-field"
                      value={newEvent.type}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, type: e.target.value })
                      }
                      required
                    >
                      <option value="">Select event type</option>
                      {eventTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={newEvent.date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea
                    className="input-field"
                    value={newEvent.notes}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, notes: e.target.value })
                    }
                    placeholder="Add details..."
                    rows="2"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowAddEvent(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Event
                  </button>
                </div>
              </form>
            )}

            {/* Timeline List */}
            <div className="timeline">
              {timeline
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((event) => (
                  <div key={event.id} className="timeline-event">
                    <div className="event-content">
                      <div className="event-header">
                        <h4>{event.type}</h4>
                        <span className="event-date">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                      {event.notes && <p className="event-notes">{event.notes}</p>}
                    </div>
                  </div>
                ))}
            </div>

            {timeline.length === 0 && (
              <div className="empty-timeline">
                <p>No events recorded yet. Start by adding your first milestone!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-navigation mt-lg">
        <Link to="/crops" className="btn btn-outline">
          ← Back to Crops
        </Link>
      </div>

      {/* ✅ Image Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <img
            src={selected}
            alt="Preview"
            className="max-w-3xl max-h-[80vh] rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default CropDetails;
