const express = require('express');
const VlmQuery = require('../models/VlmQuery');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const queries = await VlmQuery.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      queries: queries.map((q) => ({
        id: q._id.toString(),
        prompt: q.prompt,
        result: q.result,
        time: q.time,
      })),
    });
  } catch (err) {
    console.error('list queries error', err);
    res.status(500).json({ error: 'Failed to load queries' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { prompt, result, time } = req.body;
    if (!prompt || !result || !time) {
      return res.status(400).json({ error: 'prompt, result, and time are required' });
    }

    const query = await VlmQuery.create({
      userId: req.userId,
      prompt,
      result,
      time,
    });

    res.status(201).json({
      query: {
        id: query._id.toString(),
        prompt: query.prompt,
        result: query.result,
        time: query.time,
      },
    });
  } catch (err) {
    console.error('create query error', err);
    res.status(500).json({ error: 'Failed to save query' });
  }
});

module.exports = router;
