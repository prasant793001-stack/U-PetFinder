import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const DEMO_PETS = [
  { id: 'd1', status: 'lost', type: 'Cat', breed: 'Persian', colors: 'White', emirate: 'Dubai', location: 'JLT Cluster D', reward: '1000', description: 'Shy, blue collar, answers to Snowy.', date: '2026-10-18' },
  { id: 'd2', status: 'lost', type: 'Dog', breed: 'Golden Retriever', colors: 'Golden', emirate: 'Abu Dhabi', location: 'Khalifa City A', reward: '2500', description: 'Friendly, microchipped.', date: '2026-10-19' },
  { id: 'd3', status: 'found', type: 'Cat', breed: 'Domestic Shorthair', colors: 'Orange', emirate: 'Sharjah', location: 'Al Majaz 2', description: 'Found near the waterfront park, very calm.', date: '2026-10-20' },
  { id: 'd4', status: 'found', type: 'Other', breed: 'Rabbit', colors: 'Grey', emirate: 'Ajman', location: 'Al Nuaimiya', description: 'Found in building parking.', date: '2026-10-21' }
];
import './LostFoundBoard.css';

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

const animalTypes = ['Cat', 'Dog', 'Other'];

function LostFoundBoard() {
  const [status, setStatus] = useState('lost'); // 'lost' or 'found'
  const [emirate, setEmirate] = useState('All');
  const [animalType, setAnimalType] = useState('All');
  const [breed, setBreed] = useState('All');
  const [colors, setColors] = useState('All');
  const [dateRange, setDateRange] = useState('All');
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState(null);

  // Fetch pets from Firestore
  useEffect(() => {
    const fetchPets = async () => {
      if (!db) { setPets(DEMO_PETS); setLoading(false); return; }
      try {
        const q = query(
          collection(db, 'pets'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const petsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPets(petsData);
      } catch (error) {
        console.error('Error fetching pets:', error);
        setPets(DEMO_PETS);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  // Filter pets based on criteria
  const filteredPets = pets.filter(pet => {
    if ((pet.status || 'lost') !== status) return false;
    if (emirate !== 'All' && pet.emirate !== emirate) return false;
    if (animalType !== 'All' && pet.type !== animalType) return false;
    if (breed !== 'All' && pet.breed !== breed) return false;
    if (colors !== 'All' && !(pet.colors || '').includes(colors)) return false;
    return true;
  });

  return (
    <div className="lost-found-board">
      {/* Header */}
      <div className="board-header">
        <h1>
          {status === 'lost' ? '🔍 Lost Pets' : '❤️ Found Pets'}
        </h1>
        <p>
          {status === 'lost' 
            ? 'Help reunite lost pets with their families'
            : 'Help return found pets to their owners'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar glass">
        <div className="filter-group">
          <label>Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="filter-select"
          >
            <option value="lost">Lost Pets</option>
            <option value="found">Found Pets</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Emirate</label>
          <select 
            value={emirate} 
            onChange={(e) => setEmirate(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Emirates</option>
            {emirates.map(em => (
              <option key={em} value={em}>{em}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Animal Type</label>
          <select 
            value={animalType} 
            onChange={(e) => setAnimalType(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Types</option>
            {animalTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Breed</label>
          <select 
            value={breed} 
            onChange={(e) => setBreed(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Breeds</option>
            <option value="Mixed">Mixed</option>
            <option value="Persian">Persian</option>
            <option value="Siamese">Siamese</option>
            <option value="Ragdoll">Ragdoll</option>
            <option value="Labrador">Labrador</option>
            <option value="Golden Retriever">Golden Retriever</option>
            <option value="Beagle">Beagle</option>
            <option value="Poodle">Poodle</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Colors</label>
          <select 
            value={colors} 
            onChange={(e) => setColors(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Colors</option>
            <option value="Black">Black</option>
            <option value="White">White</option>
            <option value="Brown">Brown</option>
            <option value="Gray">Gray</option>
            <option value="Orange">Orange</option>
            <option value="Calico">Calico</option>
            <option value="Tabby">Tabby</option>
            <option value="Spotted">Spotted</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Date Range</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="filter-select"
          >
            <option value="All">Any Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => {
            setEmirate('All');
            setAnimalType('All');
            setBreed('All');
            setColors('All');
            setDateRange('All');
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <span>Showing {filteredPets.length} {filteredPets.length === 1 ? 'pet' : 'pets'}</span>
      </div>

      {/* Pets Grid */}
      <div className="pets-grid">
        {loading ? (
          <div className="loading">Loading pets...</div>
        ) : filteredPets.length === 0 ? (
          <div className="no-results">
            <h3>No pets found matching your criteria</h3>
            <p>Try adjusting your filters or add a new listing</p>
          </div>
        ) : (
          filteredPets.map(pet => (
            <div 
              key={pet.id} 
              className="pet-card glass"
              onClick={() => setShowMap(true)}
            >
              <div className="pet-image">
                <img 
                  src={pet.photoURL || "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23FFF1D6'/%3E%3Ctext x='200' y='170' font-size='90' text-anchor='middle'%3E%F0%9F%90%BE%3C/text%3E%3C/svg%3E"} 
                  alt={pet.breed}
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23FFF1D6'/%3E%3Ctext x='200' y='170' font-size='90' text-anchor='middle'%3E%F0%9F%90%BE%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="pet-badge">
                  {pet.status === 'lost' ? '🔴 Lost' : '🟢 Found'}
                </div>
                {pet.reward && (
                  <div className="reward-tag">
                    Reward: {pet.reward} AED
                  </div>
                )}
              </div>
              
              <div className="pet-info">
                <div className="pet-header">
                  <span className="pet-type">{pet.type}</span>
                  <span className="pet-breed">{pet.breed}</span>
                </div>
                
                <div className="pet-details">
                  <span className="pet-colors">{pet.colors}</span>
                  <span className="pet-location">📍 {pet.emirate}</span>
                </div>
                
                <div className="pet-date">
                  Posted {new Date(pet.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}
                </div>
              </div>
              
              <button className="btn btn-primary btn-full">
                Securely Chat with Owner
              </button>
            </div>
          ))
        )}
      </div>

      {/* Map Modal */}
      {showMap && mapPosition && (
        <div className="modal-overlay" onClick={() => setShowMap(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pet Location</h3>
              <button className="close-btn" onClick={() => setShowMap(false)}>×</button>
            </div>
            
            <div className="map-container">
              <div className="map-placeholder">
                <div className="map-pin" style={{ left: mapPosition.x, top: mapPosition.y }} />
                <div className="map-info">
                  <p>{pet.emirate}</p>
                  <p>Coordinates: {mapPosition.x.toFixed(4)}, {mapPosition.y.toFixed(4)}</p>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowMap(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LostFoundBoard;
