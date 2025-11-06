import { useState, useEffect } from 'react';
import { swapsAPI, eventsAPI } from '../utils/api';
import Layout from '../components/Layout';
import './Marketplace.css';

const Marketplace = () => {
  const [slots, setSlots] = useState([]);
  const [mySwappableSlots, setMySwappableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSwapModal, setShowSwapModal] = useState(null);
  const [selectedMySlot, setSelectedMySlot] = useState('');

  useEffect(() => {
    fetchSwappableSlots();
    fetchMySwappableSlots();
  }, []);

  const fetchSwappableSlots = async () => {
    try {
      const response = await swapsAPI.getSwappableSlots();
      setSlots(response.data.slots);
    } catch (error) {
      console.error('Failed to fetch swappable slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySwappableSlots = async () => {
    try {
      const response = await eventsAPI.getAll();
      const swappable = response.data.events.filter(e => e.status === 'SWAPPABLE');
      setMySwappableSlots(swappable);
    } catch (error) {
      console.error('Failed to fetch my slots:', error);
    }
  };

  const handleRequestSwap = async () => {
    if (!selectedMySlot) {
      alert('Please select one of your slots to offer');
      return;
    }

    try {
      await swapsAPI.createSwapRequest({
        mySlotId: parseInt(selectedMySlot),
        theirSlotId: showSwapModal,
      });
      setShowSwapModal(null);
      setSelectedMySlot('');
      fetchSwappableSlots();
      fetchMySwappableSlots();
      alert('Swap request sent successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create swap request');
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading marketplace...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="marketplace">
        <h1>Marketplace - Available Slots</h1>
        <p className="marketplace-description">
          Browse slots from other users that are available for swapping. Click "Request Swap" to offer one of your swappable slots.
        </p>

        {slots.length === 0 ? (
          <div className="empty-state">
            <p>No swappable slots available at the moment.</p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots.map((slot) => (
              <div key={slot.id} className="slot-card">
                <div className="slot-header">
                  <h3>{slot.title}</h3>
                  <span className="slot-user">by {slot.userName}</span>
                </div>
                <div className="slot-details">
                  <p>
                    <strong>Start:</strong> {formatDateTime(slot.startTime)}
                  </p>
                  <p>
                    <strong>End:</strong> {formatDateTime(slot.endTime)}
                  </p>
                </div>
                <button
                  onClick={() => setShowSwapModal(slot.id)}
                  className="btn-request-swap"
                >
                  Request Swap
                </button>
              </div>
            ))}
          </div>
        )}

        {showSwapModal && (
          <div className="modal-overlay" onClick={() => setShowSwapModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Select Your Slot to Offer</h2>
              <p>Choose one of your swappable slots to offer in exchange:</p>
              
              {mySwappableSlots.length === 0 ? (
                <div className="no-slots-message">
                  <p>You don't have any swappable slots. Go to Dashboard to mark slots as swappable.</p>
                  <button onClick={() => setShowSwapModal(null)} className="btn-primary">
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="slot-selection">
                    {mySwappableSlots.map((slot) => (
                      <label key={slot.id} className="slot-option">
                        <input
                          type="radio"
                          name="mySlot"
                          value={slot.id}
                          checked={selectedMySlot === slot.id.toString()}
                          onChange={(e) => setSelectedMySlot(e.target.value)}
                        />
                        <div className="slot-option-details">
                          <strong>{slot.title}</strong>
                          <span>{formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSwapModal(null);
                        setSelectedMySlot('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestSwap}
                      className="btn-primary"
                    >
                      Send Swap Request
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Marketplace;

