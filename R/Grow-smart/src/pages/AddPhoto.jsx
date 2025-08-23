import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { firebaseApp } from "../config/firebase";
import { getAuth } from "firebase/auth";

const CropPhotos = () => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const CLOUD_NAME = "doosftwev";
  const UPLOAD_PRESET = "crop_photos";

  const db = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  // ✅ Fetch photos
  useEffect(() => {
    const photosRef = collection(db, "photos");
    const q = query(photosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = [];
      for (const docSnap of snapshot.docs) {
        const photoData = docSnap.data();
        let uploader = { name: "Unknown", avatar: "" };

        if (photoData.userId) {
          try {
            const userRef = doc(db, "users", photoData.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              uploader = {
                name: userDoc.data().name || "Farmer",
                avatar: userDoc.data().photoURL || "",
              };
            }
          } catch (err) {
            console.error("User fetch error:", err);
          }
        }

        list.push({
          id: docSnap.id,
          ...photoData,
          uploader,
        });
      }
      setPhotos(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    setError("");
    setSuccess("");
    setPreview(URL.createObjectURL(file));

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("❌ Unsupported file type.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    setUploading(true);

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percent);
          },
        }
      );

      const downloadURL = res.data.secure_url;
      const publicId = res.data.public_id;
      const user = auth.currentUser;

      await addDoc(collection(db, "photos"), {
        url: downloadURL,
        publicId: publicId,
        createdAt: Timestamp.now(),
        userId: user ? user.uid : null,
        cropName: "Sample Crop", // ✅ Placeholder
        cropType: "Vegetable",   // ✅ Placeholder
      });

      setSuccess("✅ Uploaded!");
      setPreview(null);
    } catch (err) {
      console.error("Upload error:", err);
      setError("❌ Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm("🗑️ Delete this photo?")) return;
    try {
      await deleteDoc(doc(db, "photos", photoId));
      setSuccess(" Photo deleted.");
    } catch (err) {
      console.error("Delete error:", err);
      setError(" Failed to delete photo.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 🌿 Title */}
      <h2 className="text-3xl font-extrabold text-green-700 mb-8 text-center">
        Crop Gallery
      </h2>

      {/* 🌱 Gallery */}
      {loading ? (
        <p className="text-center text-green-600">⏳ Loading...</p>
      ) : photos.length === 0 ? (
        <p className="text-center text-gray-500">📭 No photos yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16 crop-gallery">
          {photos.map((photo) => (
            <div key={photo.id} className="crop-card relative group">
              {/* 📷 Image */}
              <img
                src={photo.url}
                alt="Crop"
                className="cursor-pointer"
                onClick={() => setSelected(photo.url)}
              />
              {/* Overlay */}
              <div className="overlay">
                <p className="text-xs text-white">
                  {photo.createdAt?.toDate
                    ? new Date(photo.createdAt.toDate()).toLocaleString()
                    : "Unknown date"}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                  className="delete-btn"
                >
                  🗑 Delete
                </button>
              </div>

              {/* 📑 Caption */}
              <div className="caption">
                <h3>{photo.cropName || "Unnamed Crop"}</h3>
                <p>{photo.cropType || "Unknown Type"}</p>
              </div>

              {/* 👤 Uploader */}
              <div className="uploader">
                {photo.uploader.avatar ? (
                  <img
                    src={photo.uploader.avatar}
                    alt={photo.uploader.name}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-sm text-white">
                    {photo.uploader.name[0]}
                  </div>
                )}
                <p>{photo.uploader.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 📤 Upload Box */}
      <div
        className="upload-box"
        onClick={() => fileInputRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <h2>Upload Your Crop Photo</h2>
        <p>Drag & drop your photo here or click inside this area</p>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading && (
          <div className="upload-progress">
            <div className="bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {preview && <img src={preview} alt="Preview" />}

        {success && <p className="mt-2 text-green-600">{success}</p>}
        {error && <p className="mt-2 text-red-600">{error}</p>}

        {/* 🌟 Fancy Upload Button */}
        <button className="upload-action-btn">📤 Upload Photo</button>
      </div>

      {/* 🔍 Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <img
            src={selected}
            alt="Preview"
            className="max-w-5xl max-h-[85vh] rounded-lg shadow-2xl transform scale-100 hover:scale-105 transition"
          />
        </div>
      )}
    </div>
  );
};

export default CropPhotos;
