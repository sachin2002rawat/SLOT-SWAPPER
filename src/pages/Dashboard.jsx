import { useState, useEffect } from 'react';
import { eventsAPI } from '../utils/api';
import Layout from '../components/Layout';
import './Dashboard.css';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll();
      setEvents(response.data.events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await eventsAPI.create(newEvent);
      setShowCreateModal(false);
      setNewEvent({ title: '', startTime: '', endTime: '' });
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create event');
    }
  };

  const handleToggleSwappable = async (event) => {
    const newStatus = event.status === 'BUSY' ? 'SWAPPABLE' : 'BUSY';
    try {
      await eventsAPI.update(event.id, { status: newStatus });
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventsAPI.delete(id);
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete event');
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

  const getStatusBadge = (status) => {
    const badges = {
      BUSY: 'busy',
      SWAPPABLE: 'swappable',
      SWAP_PENDING: 'pending',
    };
    return badges[status] || 'busy';
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading events...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>My Calendar</h1>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            + Create Event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <p>No events yet. Create your first event to get started!</p>
          </div>
        ) : (
          <div className="events-list">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <h3>{event.title}</h3>
                  <span className={`status-badge ${getStatusBadge(event.status)}`}>
                    {event.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="event-details">
                  <p>
                    <strong>Start:</strong> {formatDateTime(event.startTime)}
                  </p>
                  <p>
                    <strong>End:</strong> {formatDateTime(event.endTime)}
                  </p>
                </div>
                <div className="event-actions">
                  {event.status === 'SWAP_PENDING' ? (
                    <span className="pending-note">This slot is pending a swap</span>
                  ) : (
                    <button
                      onClick={() => handleToggleSwappable(event)}
                      className={`btn-toggle ${event.status === 'SWAPPABLE' ? 'active' : ''}`}
                    >
                      {event.status === 'SWAPPABLE' ? '✓ Make Busy' : 'Make Swappable'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Create New Event</h2>
              <form onSubmit={handleCreateEvent}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;

