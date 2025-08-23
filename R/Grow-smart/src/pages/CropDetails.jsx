// src/pages/CropDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const CropDetails = () => {
  const { id } = useParams();
  const [crop, setCrop] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newEvent, setNewEvent] = useState({ type: '', date: '', notes: '' });
  const [showAddEvent, setShowAddEvent] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // Allowed event types
  const eventTypes = ["Germination", "Flowering", "Fruit Set", "Harvest"];

  // 🔹 Real-time listeners for crop + timeline
  useEffect(() => {
    const cropRef = doc(db, "crops", id);
    const unsubCrop = onSnapshot(cropRef, (snap) => {
      if (snap.exists()) {
        setCrop({ id: snap.id, ...snap.data() });
      }
    });

    const timelineRef = collection(db, "crops", id, "growthTimeline");
    const unsubTimeline = onSnapshot(timelineRef, (snapshot) => {
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTimeline(events);
    });

    return () => {
      unsubCrop();
      unsubTimeline();
    };
  }, [id, db]);

  // Auto status update based on event
  const getStatusFromEvent = (eventType) => {
    switch (eventType) {
      case "Germination": return "germinating";
      case "Flowering": return "flowering";
      case "Fruit Set": return "fruiting";
      case "Harvest": return "ready";
      default: return crop?.status || "growing";
    }
  };

  // Add growth event
  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not signed in");
        return;
      }

      const when = new Date(newEvent.date);

      const eventData = {
        type: newEvent.type,
        date: when.toISOString(),
        notes: newEvent.notes,
        photos: [],
        userId: user.uid,   // ✅ required for rules
        createdAt: serverTimestamp(),
      };

      // Save event in Firestore
      await addDoc(collection(db, "crops", id, "growthTimeline"), eventData);

      // Auto-update crop status
      const newStatus = getStatusFromEvent(newEvent.type);
      await updateDoc(doc(db, "crops", id), {
        status: newStatus,
        lastUpdated: serverTimestamp()
      });

      // Reset form
      setNewEvent({ type: '', date: '', notes: '' });
      setShowAddEvent(false);
    } catch (e) {
      console.error("Error adding event:", e);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ready': return 'status-badge status-success';
      case 'flowering': return 'status-badge status-info';
      case 'fruiting': return 'status-badge status-success';
      case 'germinating': return 'status-badge status-info';
      case 'growing': return 'status-badge status-warning';
      default: return 'status-badge';
    }
  };

  const getDaysPlanted = () => {
    if (!crop?.datePlanted) return 0;
    const planted = new Date(crop.datePlanted);
    const today = new Date();
    const diffTime = Math.abs(today - planted);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!crop) {
    return <div className="loading">Loading crop details...</div>;
  }

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
            <span className={getStatusBadgeClass(crop.status)}>
              {crop.status}
            </span>
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
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                      required
                    >
                      <option value="">Select event type</option>
                      {eventTypes.map(type => (
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
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea
                    className="input-field"
                    value={newEvent.notes}
                    onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                    placeholder="Add details..."
                    rows="2"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowAddEvent(false)}>
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
                      {event.photos && event.photos.length > 0 && (
                        <div className="event-photos">
                          {event.photos.map((photo, i) => (
                            <img key={i} src={photo} alt="event" />
                          ))}
                        </div>
                      )}
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
        <Link to="/crops" className="btn btn-outline">← Back to Crops</Link>
      </div>
    </div>
  );
};

export default CropDetails;
