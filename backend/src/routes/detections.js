const express = require('express');
const Detection = require('../models/Detection');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const detections = await Detection.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      detections: detections.map((d) => ({
        id: d._id.toString(),
        title: d.title,
        summary: d.summary,
        time: d.time,
        source: d.source,
        status: d.status,
        trackedObjects: d.trackedObjects,
      })),
    });
  } catch (err) {
    console.error('list detections error', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, summary, time, source, status, trackedObjects } = req.body;
    if (!title || !summary || !time || !source || !status) {
      return res.status(400).json({ error: 'Missing required detection fields' });
    }

    const detection = await Detection.create({
      userId: req.userId,
      title,
      summary,
      time,
      source,
      status,
      trackedObjects: trackedObjects || [],
    });

    res.status(201).json({
      detection: {
        id: detection._id.toString(),
        title: detection.title,
        summary: detection.summary,
        time: detection.time,
        source: detection.source,
        status: detection.status,
        trackedObjects: detection.trackedObjects,
      },
    });
  } catch (err) {
    console.error('create detection error', err);
    res.status(500).json({ error: 'Failed to save detection' });
  }
});

module.exports = router;
