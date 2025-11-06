import express from 'express';
import { body, validationResult } from 'express-validator';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all events for the authenticated user
router.get('/', (req, res) => {
  try {
    const userId = req.user.userId;
    const events = db.prepare(
      'SELECT * FROM events WHERE userId = ? ORDER BY startTime ASC'
    ).all(userId);

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single event by ID
router.get('/:id', (req, res) => {
  try {
    const userId = req.user.userId;
    const eventId = parseInt(req.params.id);

    const event = db.prepare(
      'SELECT * FROM events WHERE id = ? AND userId = ?'
    ).get(eventId, userId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new event
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid startTime (ISO8601) is required'),
  body('endTime').isISO8601().withMessage('Valid endTime (ISO8601) is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const { title, startTime, endTime, status = 'BUSY' } = req.body;

    // Validate status
    if (!['BUSY', 'SWAPPABLE', 'SWAP_PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be BUSY, SWAPPABLE, or SWAP_PENDING' });
    }

    // Validate time range
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }

    const result = db.prepare(
      'INSERT INTO events (userId, title, startTime, endTime, status) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, title, startTime, endTime, status);

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an event
router.put('/:id', [
  body('title').optional().trim().notEmpty(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('status').optional().isIn(['BUSY', 'SWAPPABLE', 'SWAP_PENDING'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.userId;
    const eventId = parseInt(req.params.id);

    // Check if event exists and belongs to user
    const existingEvent = db.prepare(
      'SELECT * FROM events WHERE id = ? AND userId = ?'
    ).get(eventId, userId);

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (req.body.title !== undefined) {
      updates.push('title = ?');
      values.push(req.body.title);
    }
    if (req.body.startTime !== undefined) {
      updates.push('startTime = ?');
      values.push(req.body.startTime);
    }
    if (req.body.endTime !== undefined) {
      updates.push('endTime = ?');
      values.push(req.body.endTime);
    }
    if (req.body.status !== undefined) {
      updates.push('status = ?');
      values.push(req.body.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(eventId, userId);

    const updateQuery = `UPDATE events SET ${updates.join(', ')} WHERE id = ? AND userId = ?`;
    db.prepare(updateQuery).run(...values);

    const updatedEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    res.json({ event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an event
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user.userId;
    const eventId = parseInt(req.params.id);

    // Check if event exists and belongs to user
    const existingEvent = db.prepare(
      'SELECT * FROM events WHERE id = ? AND userId = ?'
    ).get(eventId, userId);

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare('DELETE FROM events WHERE id = ? AND userId = ?').run(eventId, userId);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

