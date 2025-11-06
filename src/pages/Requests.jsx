import { useState, useEffect } from 'react';
import { swapsAPI } from '../utils/api';
import Layout from '../components/Layout';
import './Requests.css';

const Requests = () => {
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await swapsAPI.getRequests();
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapResponse = async (requestId, accepted) => {
    try {
      await swapsAPI.respondToSwap(requestId, accepted);
      fetchRequests();
      alert(accepted ? 'Swap request accepted!' : 'Swap request rejected.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to respond to swap request');
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
      PENDING: 'pending',
      ACCEPTED: 'accepted',
      REJECTED: 'rejected',
    };
    return badges[status] || 'pending';
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading requests...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="requests-page">
        <h1>Swap Requests</h1>

        <div className="requests-container">
          <div className="requests-section">
            <h2>Incoming Requests</h2>
            {requests.incoming.length === 0 ? (
              <div className="empty-state">
                <p>No incoming swap requests.</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests.incoming.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h3>Swap Request from {request.requesterName}</h3>
                      <span className={`status-badge ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="request-details">
                      <div className="slot-comparison">
                        <div className="slot-box">
                          <h4>They're Offering:</h4>
                          <p><strong>{request.mySlotTitle}</strong></p>
                          <p>{formatDateTime(request.mySlotStartTime)} - {formatDateTime(request.mySlotEndTime)}</p>
                        </div>
                        <div className="swap-arrow">⇄</div>
                        <div className="slot-box">
                          <h4>In Exchange For:</h4>
                          <p><strong>{request.theirSlotTitle}</strong></p>
                          <p>{formatDateTime(request.theirSlotStartTime)} - {formatDateTime(request.theirSlotEndTime)}</p>
                        </div>
                      </div>
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="request-actions">
                        <button
                          onClick={() => handleSwapResponse(request.id, true)}
                          className="btn-accept"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleSwapResponse(request.id, false)}
                          className="btn-reject"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    <div className="request-meta">
                      <small>Requested on {formatDateTime(request.createdAt)}</small>
                      {request.respondedAt && (
                        <small>Responded on {formatDateTime(request.respondedAt)}</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="requests-section">
            <h2>Outgoing Requests</h2>
            {requests.outgoing.length === 0 ? (
              <div className="empty-state">
                <p>No outgoing swap requests.</p>
              </div>
            ) : (
              <div className="requests-list">
                {requests.outgoing.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h3>Swap Request to {request.requesteeName}</h3>
                      <span className={`status-badge ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="request-details">
                      <div className="slot-comparison">
                        <div className="slot-box">
                          <h4>You're Offering:</h4>
                          <p><strong>{request.mySlotTitle}</strong></p>
                          <p>{formatDateTime(request.mySlotStartTime)} - {formatDateTime(request.mySlotEndTime)}</p>
                        </div>
                        <div className="swap-arrow">⇄</div>
                        <div className="slot-box">
                          <h4>In Exchange For:</h4>
                          <p><strong>{request.theirSlotTitle}</strong></p>
                          <p>{formatDateTime(request.theirSlotStartTime)} - {formatDateTime(request.theirSlotEndTime)}</p>
                        </div>
                      </div>
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="request-status-message">
                        <p>Waiting for response...</p>
                      </div>
                    )}
                    <div className="request-meta">
                      <small>Requested on {formatDateTime(request.createdAt)}</small>
                      {request.respondedAt && (
                        <small>Responded on {formatDateTime(request.respondedAt)}</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Requests;

