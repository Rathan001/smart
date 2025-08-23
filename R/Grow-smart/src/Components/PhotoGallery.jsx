// src/components/PhotoGallery.jsx
import React, { useEffect, useState } from 'react';
import { db, storage } from '../config/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';

/**
 * PhotoGallery
 * - Fetches image metadata from Firestore (collection: 'photos') and renders a responsive grid.
 * - Includes an alternative function `listFromStorage` (commented) to list files directly from Cloud Storage.
 */
export default function PhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchPhotos = async () => {
      try {
        const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (mounted) setPhotos(items);
      } catch (err) {
        console.error('fetchPhotos error', err);
        if (mounted) setError(err.message || 'Failed to load photos');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPhotos();

    return () => { mounted = false; };
  }, []);

  // --- Alternative: list directly from Storage (uncomment to use) ---
  /*
  useEffect(() => {
    const listFromStorage = async () => {
      try {
        const listRef = storageRef(storage, 'photos/');
        const res = await listAll(listRef);
        const urls = await Promise.all(res.items.map(item => getDownloadURL(item)));
        setPhotos(urls.map((u, i) => ({ id: i, url: u })));
      } catch (err) {
        console.error('listFromStorage error', err);
      }
    };
    listFromStorage();
  }, []);
  */

  if (loading) return <div className="p-4">Loading photos…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  if (!photos.length) return <div className="p-4">No photos yet. Add one!</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Photos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((p) => (
          <div key={p.id} className="bg-white rounded shadow overflow-hidden">
            <img
              src={p.url}
              alt={p.caption || 'Crop photo'}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
            <div className="p-2">
              {p.caption && <div className="text-sm text-gray-700">{p.caption}</div>}
              <div className="mt-2 flex justify-between items-center">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-green-700 underline"
                >
                  Open
                </a>
                <div className="text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleString() : ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
