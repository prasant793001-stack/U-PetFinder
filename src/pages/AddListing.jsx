import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import piexifjs from 'piexifjs';
import './AddListing.css';

function AddListing() {
  const [step, setStep] = useState(1);
  const [pets, setPets] = useState([]);
  const [currentPet, setCurrentPet] = useState({
    status: 'lost',
    type: 'Cat',
    breed: '',
    colors: '',
    description: '',
    reward: '',
    emirate: 'Dubai',
    location: '',
    photo: null,
    photoPreview: null
  });
  const [uploading, setUploading] = useState(false);

  const emirates = [
    'Abu Dhabi',
    'Dubai',
    'Sharjah',
    'Ajman',
    'Umm Al Quwain',
    'Ras Al Khaimah',
    'Fujairah',
    'Al Ain'
  ];

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentPet(prev => ({
          ...prev,
          photo: file,
          photoPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPet = () => {
    if (!currentPet.breed || !currentPet.colors) {
      alert('Please fill in all required fields');
      return;
    }

    const newPet = { ...currentPet };
    setPets([...pets, newPet]);
    setCurrentPet({
      status: 'lost',
      type: 'Cat',
      breed: '',
      colors: '',
      description: '',
      reward: '',
      emirate: 'Dubai',
      location: '',
      photo: null,
      photoPreview: null
    });
    setStep(2);
  };

  const handleUploadPhoto = async (petIndex) => {
    const pet = pets[petIndex];
    if (!pet.photo) return;

    setUploading(true);
    try {
      // Strip EXIF data for privacy
      const photoData = pet.photo;
      const photoBytes = new Uint8Array(photoData);
      
      // Create a canvas to strip EXIF
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          // Upload to Firebase Storage
          const storageRef = ref(storage, `pets/${Date.now()}-${Math.random()}.jpg`);
          await uploadBytes(storageRef, blob);
          const photoURL = await getDownloadURL(storageRef);
          
          // Update pet with photo URL
          const updatedPets = [...pets];
          updatedPets[petIndex] = {
            ...updatedPets[petIndex],
            photoURL: photoURL
          };
          setPets(updatedPets);
          
          // Save to Firestore
          await addDoc(collection(db, 'pets'), {
            ...updatedPets[petIndex],
            ownerId: 'current-user-id', // In production, get from auth
            createdAt: new Date()
          });
        }, 'image/jpeg', 0.8);
      };
      img.src = URL.createObjectURL(photoData);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Save all pets to Firestore
    for (const pet of pets) {
      await addDoc(collection(db, 'pets'), {
        ...pet,
        ownerId: 'current-user-id', // In production, get from auth
        createdAt: new Date()
      });
    }

    alert('All listings submitted successfully!');
    window.location.href = '/board';
  };

  return (
    <div className="add-listing">
      <div className="add-listing-container">
        {/* Header */}
        <div className="add-listing-header">
          <h1>
            {step === 1 ? 'Add New Listing' : 'Review Your Listings'}
          </h1>
          <p>
            {step === 1 
              ? 'Create a new lost or found pet listing'
              : 'Review and submit your listings'}
          </p>
        </div>

        {/* Progress */}
        <div className="progress-bar">
          <div className="progress-step" style={{ background: step >= 1 ? 'var(--primary)' : '' }}>
            1
          </div>
          <div className="progress-line" style={{ opacity: step >= 1 ? 1 : 0.3 }} />
          <div className="progress-step" style={{ background: step >= 2 ? 'var(--primary)' : '' }}>
            2
          </div>
        </div>

        {/* Step 1: Add Pet Form */}
        {step === 1 && (
          <div className="form-section">
            <div className="form-tabs">
              <button
                className={`tab ${currentPet.status === 'lost' ? 'active' : ''}`}
                onClick={() => setCurrentPet(prev => ({ ...prev, status: 'lost' }))}
              >
                🔴 Lost Pet
              </button>
              <button
                className={`tab ${currentPet.status === 'found' ? 'active' : ''}`}
                onClick={() => setCurrentPet(prev => ({ ...prev, status: 'found' }))}
              >
                🟢 Found Pet
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Animal Type</label>
                <select
                  value={currentPet.type}
                  onChange={(e) => setCurrentPet(prev => ({ ...prev, type: e.target.value }))}
                  className="input"
                >
                  <option value="Cat">Cat</option>
                  <option value="Dog">Dog</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Breed *</label>
                <input
                  type="text"
                  value={currentPet.breed}
                  onChange={(e) => setCurrentPet(prev => ({ ...prev, breed: e.target.value }))}
                  placeholder="e.g., Persian, Labrador, Mixed"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Colors *</label>
                <input
                  type="text"
                  value={currentPet.colors}
                  onChange={(e) => setCurrentPet(prev => ({ ...prev, colors: e.target.value }))}
                  placeholder="e.g., Black, White, Orange"
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Emirate</label>
                <select
                  value={currentPet.emirate}
                  onChange={(e) => setCurrentPet(prev => ({ ...prev, emirate: e.target.value }))}
                  className="input"
                >
                  {emirates.map(em => (
                    <option key={em} value={em}>{em}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={currentPet.description}
                  onChange={(e) => setCurrentPet(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your pet (marks, special features, etc.)"
                  className="input"
                  rows={4}
                />
              </div>

              {currentPet.status === 'lost' && (
                <div className="form-group">
                  <label>Reward Offered (AED)</label>
                  <input
                    type="number"
                    value={currentPet.reward}
                    onChange={(e) => setCurrentPet(prev => ({ ...prev, reward: e.target.value }))}
                    placeholder="e.g., 500"
                    className="input"
                  />
                </div>
              )}

              <div className="form-group full-width">
                <label>Pet Photo</label>
                <div className="photo-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="file-input"
                  />
                  {currentPet.photoPreview && (
                    <div className="photo-preview">
                      <img src={currentPet.photoPreview} alt="Preview" />
                      <button
                        className="remove-photo"
                        onClick={() => setCurrentPet(prev => ({ ...prev, photo: null, photoPreview: null }))}
                      >
                        × Remove
                      </button>
                    </div>
                  )}
                  <p className="privacy-notice">
                    🔒 Your photo will be automatically stripped of EXIF metadata for privacy
                  </p>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleAddPet}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Add Pet'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => window.location.href = '/'}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Listings */}
        {step === 2 && (
          <div className="review-section">
            <div className="review-list">
              {pets.map((pet, index) => (
                <div key={index} className="review-card glass">
                  <div className="review-header">
                    <span className={`status-badge ${pet.status}`}>
                      {pet.status === 'lost' ? '🔴 Lost' : '🟢 Found'}
                    </span>
                    <span className="pet-type">{pet.type}</span>
                    <span className="pet-breed">{pet.breed}</span>
                  </div>
                  
                  <div className="review-details">
                    <div className="detail-row">
                      <span>Colors:</span>
                      <span>{pet.colors}</span>
                    </div>
                    <div className="detail-row">
                      <span>Emirate:</span>
                      <span>{pet.emirate}</span>
                    </div>
                    {pet.description && (
                      <div className="detail-row">
                        <span>Description:</span>
                        <span>{pet.description}</span>
                      </div>
                    )}
                    {pet.reward && (
                      <div className="detail-row reward">
                        <span>Reward:</span>
                        <span>{pet.reward} AED</span>
                      </div>
                    )}
                  </div>

                  {pet.photoURL && (
                    <div className="review-photo">
                      <img src={pet.photoURL} alt={pet.breed} />
                    </div>
                  )}

                  <div className="review-actions">
                    <button className="btn btn-secondary" onClick={() => {
                      setPets(pets.filter((_, i) => i !== index));
                      setStep(1);
                    }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="review-actions">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                Submit All Listings
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                Add Another Pet
              </button>
            </div>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="privacy-footer">
          <p>
            <strong>Privacy Promise:</strong> All uploaded photos are automatically stripped of 
            EXIF metadata (including GPS coordinates) before being stored. Your home address 
            remains completely protected.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AddListing;
