// src/pages/AddCrop.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getWeatherForecast } from '../utils/weather';

const AddCrop = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    datePlanted: '',
    containerSize: '',
    sunlightReq: '',
    source: '',
    notes: '',
    photos: [],
    wateringFrequency: '',
    fertilizingFrequency: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files.map(file => URL.createObjectURL(file))]
    }));
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userCropRef = doc(collection(db, 'users', user.uid, 'crops'));
      const cropId = userCropRef.id;

      const cropData = {
        ...formData,
        id: cropId,
        ownerId: user.uid,
        season: new Date().getMonth() < 6 ? 'Spring/Summer' : 'Fall/Winter',
        createdAt: new Date().toISOString()
      };

      // Save to user-specific collection
      await setDoc(userCropRef, cropData);

      // Optional: Save to global crops collection (only if needed)
      try {
        await setDoc(doc(db, 'crops', cropId), cropData);
      } catch (globalError) {
        console.warn('Global crop write failed:', globalError.message || globalError.code || globalError);
      }

      navigate('/crops');
    } catch (error) {
      console.error('Error saving crop:', error.message || error.code || error);
      alert(`Error saving crop: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const cropSuggestions = [
    'Tomatoes', 'Basil', 'Lettuce', 'Peppers', 'Herbs', 'Spinach',
    'Carrots', 'Radishes', 'Green Onions', 'Mint', 'Cilantro', 'Parsley'
  ];

  const containerSizes = [
    '1 gallon', '2 gallon', '3 gallon', '5 gallon', '7 gallon', '10 gallon',
    'Small pot', 'Medium pot', 'Large pot', 'Raised bed', 'Window box'
  ];

  const sunlightOptions = [
    'Full sun (6+ hours)', 'Partial sun (4-6 hours)', 'Partial shade (2-4 hours)', 
    'Full shade (less than 2 hours)'
  ];

  const sourceOptions = [
    'Seeds from packet', 'Seedlings from nursery', 'Cuttings', 
    'Transplanted', 'Gift from friend', 'Online order', 'Local market'
  ];

  return (
    <div className="add-crop">
      <div className="page-header mb-lg">
        <h1>Add New Crop</h1>
        <p>Add a new plant to your urban garden collection</p>
      </div>

      <form onSubmit={handleSubmit} className="crop-form">
        <div className="grid grid-cols-2 gap-lg">
          <div className="card">
            <h2>Basic Information</h2>

            <div className="input-group">
              <label className="input-label">Crop Name *</label>
              <input
                type="text"
                name="name"
                className="input-field"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Cherry Tomatoes"
                required
                list="crop-suggestions"
              />
              <datalist id="crop-suggestions">
                {cropSuggestions.map((crop, index) => (
                  <option key={index} value={crop} />
                ))}
              </datalist>
            </div>

            <div className="input-group">
              <label className="input-label">Variety</label>
              <input
                type="text"
                name="variety"
                className="input-field"
                value={formData.variety}
                onChange={handleInputChange}
                placeholder="e.g., Sweet 100, Cherokee Purple"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Date Planted *</label>
              <input
                type="date"
                name="datePlanted"
                className="input-field"
                value={formData.datePlanted}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="card">
            <h2> Growing Conditions</h2>

            <div className="input-group">
              <label className="input-label">Container Size *</label>
              <select
                name="containerSize"
                className="input-field"
                value={formData.containerSize}
                onChange={handleInputChange}
                required
              >
                <option value="">Select container size</option>
                {containerSizes.map((size, index) => (
                  <option key={index} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Sunlight Requirement *</label>
              <select
                name="sunlightReq"
                className="input-field"
                value={formData.sunlightReq}
                onChange={handleInputChange}
                required
              >
                <option value="">Select sunlight needs</option>
                {sunlightOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Source</label>
              <select
                name="source"
                className="input-field"
                value={formData.source}
                onChange={handleInputChange}
              >
                <option value="">Select source</option>
                {sourceOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
          </div>
        </div>
      </div>

      <div className="card mt-lg">
        <h2> Care Schedule</h2>

        <div className="input-group">
          <label className="input-label">Watering Frequency (days)</label>
          <input
            type="number"
            name="wateringFrequency"
            className="input-field"
            value={formData.wateringFrequency}
            onChange={handleInputChange}
            placeholder="e.g., 3"
            min="1"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Fertilizing Frequency (days)</label>
          <input
            type="number"
            name="fertilizingFrequency"
            className="input-field"
            value={formData.fertilizingFrequency}
            onChange={handleInputChange}
            placeholder="e.g., 14"
            min="1"
          />
        </div>
      </div>

      <div className="card mt-lg">
        <h2> Additional Information</h2>

        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea
            name="notes"
            className="input-field textarea"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Add any notes about this crop, growing conditions, observations, etc."
            rows="4"
          />
        </div>

        <div className="input-group">
          <label className="input-label">Photos</label>
          <input
            type="file"
            className="input-field"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
          />
          <small className="help-text">Upload photos of your crop (optional)</small>

          {formData.photos.length > 0 && (
            <div className="photo-preview">
              <h4>Photo Preview:</h4>
              <div className="photos-grid">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="photo-item">
                    <img src={photo} alt={`Crop photo ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-photo"
                      onClick={() => removePhoto(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/crops')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding Crop...' : 'Add Crop'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCrop;
