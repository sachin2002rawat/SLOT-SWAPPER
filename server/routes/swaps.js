import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all swappable slots from other users
router.get('/swappable-slots', (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all slots from other users that are SWAPPABLE
    const slots = db.prepare(`
      SELECT 
        e.id,
        e.title,
        e.startTime,
        e.endTime,
        e.status,
        u.id as userId,
        u.name as userName,
        u.email as userEmail
      FROM events e
      JOIN users u ON e.userId = u.id
      WHERE e.status = 'SWAPPABLE' AND e.userId != ?
      ORDER BY e.startTime ASC
    `).all(userId);

    res.json({ slots });
  } catch (error) {
    console.error('Get swappable slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a swap request
router.post('/swap-request', [
  body('mySlotId').isInt().withMessage('mySlotId must be a valid integer'),
  body('theirSlotId').isInt().withMessage('theirSlotId must be a valid integer')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { mySlotId, theirSlotId } = req.body;

    // Validate both slots exist and are SWAPPABLE
    const mySlot = db.prepare(
      'SELECT * FROM events WHERE id = ? AND userId = ?'
    ).get(mySlotId, userId);

    if (!mySlot) {
      return res.status(404).json({ error: 'Your slot not found' });
    }

    if (mySlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Your slot must be SWAPPABLE' });
    }

    const theirSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(theirSlotId);

    if (!theirSlot) {
      return res.status(404).json({ error: 'Requested slot not found' });
    }

    if (theirSlot.userId === userId) {
      return res.status(400).json({ error: 'Cannot swap with your own slot' });
    }

    if (theirSlot.status !== 'SWAPPABLE') {
      return res.status(400).json({ error: 'Requested slot must be SWAPPABLE' });
    }

    // Check if there's already a pending swap request for either slot
    const existingRequest = db.prepare(`
      SELECT * FROM swap_requests 
      WHERE status = 'PENDING' 
      AND (
        (requesterSlotId = ? OR requesterSlotId = ?) 
        OR (requesteeSlotId = ? OR requesteeSlotId = ?)
      )
    `).get(mySlotId, theirSlotId, mySlotId, theirSlotId);

    if (existingRequest) {
      return res.status(400).json({ error: 'One or both slots are already involved in a pending swap' });
    }

    // Start transaction
    const transaction = db.transaction(() => {
      // Create swap request
      const result = db.prepare(`
        INSERT INTO swap_requests (requesterId, requesteeId, requesterSlotId, requesteeSlotId, status)
        VALUES (?, ?, ?, ?, 'PENDING')
      `).run(userId, theirSlot.userId, mySlotId, theirSlotId);

      // Update both slots to SWAP_PENDING
      db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAP_PENDING', mySlotId);
      db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAP_PENDING', theirSlotId);

      return result.lastInsertRowid;
    });

    const requestId = transaction();

    // Fetch the created swap request with user details
    const swapRequest = db.prepare(`
      SELECT 
        sr.*,
        rq.name as requesterName,
        rqe.name as requesteeName,
        mySlot.title as mySlotTitle,
        mySlot.startTime as mySlotStartTime,
        mySlot.endTime as mySlotEndTime,
        theirSlot.title as theirSlotTitle,
        theirSlot.startTime as theirSlotStartTime,
        theirSlot.endTime as theirSlotEndTime
      FROM swap_requests sr
      JOIN users rq ON sr.requesterId = rq.id
      JOIN users rqe ON sr.requesteeId = rqe.id
      JOIN events mySlot ON sr.requesterSlotId = mySlot.id
      JOIN events theirSlot ON sr.requesteeSlotId = theirSlot.id
      WHERE sr.id = ?
    `).get(requestId);

    res.status(201).json({ 
      message: 'Swap request created successfully',
      swapRequest 
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to a swap request (Accept or Reject)
router.post('/swap-response/:requestId', [
  body('accepted').isBoolean().withMessage('accepted must be a boolean')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const requestId = parseInt(req.params.requestId);
    const { accepted } = req.body;

    // Get the swap request
    const swapRequest = db.prepare(`
      SELECT * FROM swap_requests WHERE id = ?
    `).get(requestId);

    if (!swapRequest) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Verify the user is the requestee (the one receiving the request)
    if (swapRequest.requesteeId !== userId) {
      return res.status(403).json({ error: 'You can only respond to swap requests sent to you' });
    }

    if (swapRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Swap request is not pending' });
    }

    // Execute transaction based on acceptance/rejection
    const transaction = db.transaction(() => {
      if (accepted) {
        // ACCEPT: Swap the owners of the slots
        // Get both slots
        const requesterSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(swapRequest.requesterSlotId);
        const requesteeSlot = db.prepare('SELECT * FROM events WHERE id = ?').get(swapRequest.requesteeSlotId);

        // Swap the userIds
        db.prepare('UPDATE events SET userId = ?, status = ? WHERE id = ?').run(
          swapRequest.requesteeId,
          'BUSY',
          swapRequest.requesterSlotId
        );
        db.prepare('UPDATE events SET userId = ?, status = ? WHERE id = ?').run(
          swapRequest.requesterId,
          'BUSY',
          swapRequest.requesteeSlotId
        );

        // Update swap request status
        db.prepare(`
          UPDATE swap_requests 
          SET status = 'ACCEPTED', respondedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(requestId);
      } else {
        // REJECT: Set both slots back to SWAPPABLE
        db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAPPABLE', swapRequest.requesterSlotId);
        db.prepare('UPDATE events SET status = ? WHERE id = ?').run('SWAPPABLE', swapRequest.requesteeSlotId);

        // Update swap request status
        db.prepare(`
          UPDATE swap_requests 
          SET status = 'REJECTED', respondedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(requestId);
      }
    });

    transaction();

    // Fetch updated swap request
    const updatedRequest = db.prepare(`
      SELECT 
        sr.*,
        rq.name as requesterName,
        rqe.name as requesteeName,
        mySlot.title as mySlotTitle,
        mySlot.startTime as mySlotStartTime,
        mySlot.endTime as mySlotEndTime,
        theirSlot.title as theirSlotTitle,
        theirSlot.startTime as theirSlotStartTime,
        theirSlot.endTime as theirSlotEndTime
      FROM swap_requests sr
      JOIN users rq ON sr.requesterId = rq.id
      JOIN users rqe ON sr.requesteeId = rqe.id
      JOIN events mySlot ON sr.requesterSlotId = mySlot.id
      JOIN events theirSlot ON sr.requesteeSlotId = theirSlot.id
      WHERE sr.id = ?
    `).get(requestId);

    res.json({
      message: accepted ? 'Swap request accepted' : 'Swap request rejected',
      swapRequest: updatedRequest
    });
  } catch (error) {
    console.error('Swap response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all swap requests (incoming and outgoing)
router.get('/requests', (req, res) => {
  try {
    const userId = req.user.userId;

    // Get incoming requests (where user is the requestee)
    const incomingRequests = db.prepare(`
      SELECT 
        sr.*,
        rq.id as requesterId,
        rq.name as requesterName,
        rq.email as requesterEmail,
        mySlot.id as mySlotId,
        mySlot.title as mySlotTitle,
        mySlot.startTime as mySlotStartTime,
        mySlot.endTime as mySlotEndTime,
        theirSlot.id as theirSlotId,
        theirSlot.title as theirSlotTitle,
        theirSlot.startTime as theirSlotStartTime,
        theirSlot.endTime as theirSlotEndTime
      FROM swap_requests sr
      JOIN users rq ON sr.requesterId = rq.id
      JOIN events mySlot ON sr.requesterSlotId = mySlot.id
      JOIN events theirSlot ON sr.requesteeSlotId = theirSlot.id
      WHERE sr.requesteeId = ?
      ORDER BY sr.createdAt DESC
    `).all(userId);

    // Get outgoing requests (where user is the requester)
    const outgoingRequests = db.prepare(`
      SELECT 
        sr.*,
        rqe.id as requesteeId,
        rqe.name as requesteeName,
        rqe.email as requesteeEmail,
        mySlot.id as mySlotId,
        mySlot.title as mySlotTitle,
        mySlot.startTime as mySlotStartTime,
        mySlot.endTime as mySlotEndTime,
        theirSlot.id as theirSlotId,
        theirSlot.title as theirSlotTitle,
        theirSlot.startTime as theirSlotStartTime,
        theirSlot.endTime as theirSlotEndTime
      FROM swap_requests sr
      JOIN users rqe ON sr.requesteeId = rqe.id
      JOIN events mySlot ON sr.requesterSlotId = mySlot.id
      JOIN events theirSlot ON sr.requesteeSlotId = theirSlot.id
      WHERE sr.requesterId = ?
      ORDER BY sr.createdAt DESC
    `).all(userId);

    res.json({
      incoming: incomingRequests,
      outgoing: outgoingRequests
    });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

