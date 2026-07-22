# Fatima's Backend Audit Findings

This document summarizes the audit of Fatima's backend implementation on the `main` branch (`origin/main`, commit `95c89e014766cdb22f05b0ded45a8077423c3f4e`).

---

## 1. Framework and Structure

### Framework
Fatima's backend is written in **Node.js** using the **Express** web framework and **Mongoose** (MongoDB object modeling). 

### Directory Layout
The folder structure under `backend/` is as follows:
```
backend/
├── .env                  # Local environment configuration
├── .env.example          # Template environment file
├── package.json          # Node.js project manifest & dependencies
├── package-lock.json     # Node.js locked dependencies
├── README.md             # Brief backend readme
├── node_modules/         # Node dependencies folder
├── scripts/
│   └── seed.js           # Database seed script for test users/data
└── src/
    ├── index.js          # Entry point for the server
    ├── config/
    │   └── db.js         # Mongoose connection config
    ├── middleware/
    │   └── auth.js       # JWT authorization middleware
    ├── models/
    │   ├── User.js       # Mongoose schema for User
    │   ├── Detection.js  # Mongoose schema for Detection
    │   └── VlmQuery.js   # Mongoose schema for VlmQuery
    └── routes/
        ├── auth.js       # Authentication routers (register, login, me)
        ├── detections.js # Detections retrieval/storage endpoints
        ├── queries.js    # VLM query logging/history endpoints
        └── analytics.js  # Summary analytics endpoints
```

---

## 2. Server Startup & Verification

### Run Status
The backend **does not run** on the current environment because the system lacks Node.js, npm, and a running MongoDB instance.

### CLI Outputs

Running `npm start`:
```bash
$ npm start
Command 'npm' not found, but can be installed with:
sudo apt install npm
```

Running `node src/index.js`:
```bash
$ node src/index.js
Command 'node' not found, but can be installed with:
sudo apt install nodejs
```

Running `docker --version` (checking for containerized execution option):
```bash
$ docker --version
The command 'docker' could not be found in this WSL 2 distro.
We recommend to activate the WSL integration in Docker Desktop settings.
```

---

## 3. Database & System Models

The database models defined in the codebase are Mongoose schemas that connect to MongoDB. They are:
1. **User** (`backend/src/models/User.js`): Fully integrated for authentication.
2. **Detection** (`backend/src/models/Detection.js`): Fully integrated for saving and listing security detections.
3. **VlmQuery** (`backend/src/models/VlmQuery.js`): Fully integrated for storing/retrieving prompt results.

### Integration Status vs. Mocking
- **Database Layer**: All three models are **fully integrated** into the CRUD endpoints of the API.
- **ML / AI Inference**: There are **no machine learning models (like YOLO, GroundingDINO, Llama, Qwen, etc.)** integrated in Fatima's code. In this backend, "models" only refers to Mongoose data models. The backend serves purely as a data-store wrapper; the actual vision inference or query parsing processing is completely stubbed/mocked. The endpoints accept pre-processed AI data (e.g. `trackedObjects` arrays or VLM results) directly from the client via HTTP requests and save them as-is to MongoDB.

---

## 4. Main Endpoint Request/Response Schema

Below are the exact schemas and implementation code for the core endpoints.

### 1. VLM Queries Endpoint (`POST /api/queries`)
Saves a VLM query prompt and result.

**Route Code (`backend/src/routes/queries.js`):**
```javascript
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
```

### 2. Detections Endpoint (`POST /api/detections`)
Saves a new object detection capture record.

**Route Code (`backend/src/routes/detections.js`):**
```javascript
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
```

### 3. Analytics Endpoint (`GET /api/analytics/summary`)
Returns aggregated metrics and system statistics.

**Route Code (`backend/src/routes/analytics.js`):**
```javascript
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
```

---

## 5. Duplication & Code Overlap with `main` / `staging`

### Overlap Analysis
There is **no overlap** in implementation logic or codebase structure:
1. **Language/Framework Change**: Staging is written in **Python (FastAPI)**. Fatima's branch is written in **Node.js (Express)**.
2. **Feature Discrepancy**: 
   - The **staging** backend implements a full CV/VLM execution pipeline, including a query parser using Llama 3 (`backend/app/services/query_parser.py`), detector interfaces (`detector.py`), segmentation (`segmenter.py`), tracking (`tracker.py`), and response composition (`composer.py`).
   - **Fatima's** backend contains **none** of these components. It is strictly a CRUD storage system for client-reported events.
3. **File Duplication**: There are no duplicate files or duplicate logic. Fatima completely deleted the Python `app/` folder and vision services, replacing the backend folder entirely with the Express application. 

Additionally, the frontend on staging (React/Vite) was entirely replaced by a Flutter mobile codebase (`lib/`, `pubspec.yaml`, etc.) in the repository root.

---

## 6. Environment and Dependency Requirements

To build and run Fatima's branch backend, the following requirements must be added to the environment (which are not present or required on the staging branch):

### System Requirements
1. **Node.js** (v18+ recommended)
2. **npm** or **yarn** package manager
3. **MongoDB Server** (running locally or accessible via URI, defaults to `mongodb://127.0.0.1:27017/insightvision`)

### Node.js Packages (from `package.json`):
- `express` (^5.1.0) - HTTP web framework
- `mongoose` (^8.15.1) - MongoDB ODM
- `jsonwebtoken` (^9.0.2) - Auth token handling
- `bcryptjs` (^3.0.2) - Password hashing
- `cors` (^2.8.5) - CORS middleware
- `dotenv` (^16.5.0) - Env configuration loader
