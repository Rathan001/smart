// src/pages/CropLibrary.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebase';

const CropLibrary = () => {
  const [crops, setCrops] = useState([]);
  const [filteredCrops, setFilteredCrops] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const cropsRef = collection(db, 'users', user.uid, 'crops');
          const snapshot = await getDocs(cropsRef);
          const userCrops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCrops(userCrops);
          setFilteredCrops(userCrops);
        } catch (err) {
          console.error('Error fetching crops:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = crops;

    if (searchTerm) {
      filtered = filtered.filter(crop =>
        crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.variety.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(crop => crop.status === filterStatus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.datePlanted) - new Date(a.datePlanted);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredCrops(filtered);
  }, [crops, searchTerm, filterStatus, sortBy]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ready': return 'status-badge status-success';
      case 'flowering': return 'status-badge status-info';
      case 'fruiting': return 'status-badge status-success';
      case 'growing': return 'status-badge status-warning';
      case 'germinating': return 'status-badge status-info';
      default: return 'status-badge';
    }
  };

  const getDaysPlanted = (datePlanted) => {
    const planted = new Date(datePlanted);
    const today = new Date();
    const diffTime = Math.abs(today - planted);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="crop-library">
      <div className="page-header mb-lg">
        <h1>🌿 Crop Library</h1>
        <p>Manage and track all your urban garden crops</p>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p>Loading your crops...</p>
        </div>
      ) : (
        <>
          <div className="card mb-lg">
            <div className="controls-grid">
              <div className="input-group">
                <label className="input-label">🔍 Search Crops</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Search by name or variety..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">📊 Filter by Status</label>
                <select
                  className="input-field"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="germinating">Germinating</option>
                  <option value="growing">Growing</option>
                  <option value="flowering">Flowering</option>
                  <option value="fruiting">Fruiting</option>
                  <option value="ready">Ready to Harvest</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">🔄 Sort by</label>
                <select
                  className="input-field"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Name</option>
                  <option value="date">Date Planted</option>
                  <option value="status">Status</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">&nbsp;</label>
                <Link to="/add-crop" className="btn btn-primary">
                  + Add New Crop
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3">
            {filteredCrops.map((crop) => (
              <div key={crop.id} className="card crop-card">
                <div className="crop-card-header">
                  <div className="crop-main-info">
                    <h3>{crop.name}</h3>
                    <p className="crop-variety">{crop.variety}</p>
                  </div>
                  <span className={getStatusBadgeClass(crop.status)}>
                    {crop.status}
                  </span>
                </div>

                <div className="crop-details">
                  <div className="detail-row">
                    <span className="detail-label">📅 Planted:</span>
                    <span className="detail-value">
                      {new Date(crop.datePlanted).toLocaleDateString()}<br />
                      <small>({getDaysPlanted(crop.datePlanted)} days ago)</small>
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">🪴 Container:</span>
                    <span className="detail-value">{crop.containerSize}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">☀️ Light:</span>
                    <span className="detail-value">{crop.sunlightReq}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">🌱 Source:</span>
                    <span className="detail-value">{crop.source}</span>
                  </div>

                  {crop.notes && (
                    <div className="crop-notes">
                      <span className="detail-label">📝 Notes:</span>
                      <p>{crop.notes}</p>
                    </div>
                  )}
                </div>

                <div className="crop-card-actions">
                  <Link to={`/crop/${crop.id}`} className="btn btn-primary">
                    View Details
                  </Link>
                  <button className="btn btn-outline">
                    📸 Add Photo
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCrops.length === 0 && (
            <div className="empty-state">
              <div className="card text-center">
                <h3>🌱 No crops found</h3>
                <p>
                  {searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Start your urban garden by adding your first crop!'}
                </p>
                <Link to="/add-crop" className="btn btn-primary mt-md">
                  + Add Your First Crop
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CropLibrary;
