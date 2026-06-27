const express = require('express');
const mongoose = require('mongoose');
const Detection = require('../models/Detection');
const VlmQuery = require('../models/VlmQuery');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const [totalDetections, flaggedCount, completedCount, totalQueries] =
      await Promise.all([
        Detection.countDocuments({ userId }),
        Detection.countDocuments({ userId, status: 'Flagged' }),
        Detection.countDocuments({ userId, status: 'Completed' }),
        VlmQuery.countDocuments({ userId }),
      ]);

    const recentDetections = await Detection.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const statusBreakdown = await Detection.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      summary: {
        totalDetections,
        flaggedCount,
        completedCount,
        totalQueries,
        activeNodes: 4,
        avgLatencyMs: 14,
        systemStatus: flaggedCount > 0 ? 'ALERT' : 'STABLE',
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      recentActivity: recentDetections.map((d) => ({
        id: d._id.toString(),
        title: d.title,
        status: d.status,
        time: d.time,
      })),
    });
  } catch (err) {
    console.error('analytics summary error', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;
