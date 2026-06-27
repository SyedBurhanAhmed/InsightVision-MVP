require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Detection = require('../src/models/Detection');
const VlmQuery = require('../src/models/VlmQuery');

const demoEmail = 'demo@insightvision.ai';
const demoPassword = 'demo123';

const sampleDetections = [
  {
    title: 'Spatial Anomaly Detection',
    summary:
      'Security perimeter breach detected in Zone 4. Identification of unauthorized heat signatures.',
    time: '14:42 PM',
    source: 'Vision AI v4.2',
    status: 'Flagged',
    trackedObjects: ['Person', 'Backpack', 'Fence Gate'],
  },
  {
    title: 'Logistics Traffic Analysis',
    summary:
      'Routine scan of warehouse automation flow. Efficiency optimization suggested at 94%.',
    time: '08:15 AM',
    source: 'System Scan',
    status: 'Completed',
    trackedObjects: ['Forklift', 'Pallet', 'Worker', 'Drone'],
  },
  {
    title: 'Neural Core Calibration',
    summary:
      'Automated diagnostic of vision processing cluster. All nodes operating within nominal parameters.',
    time: '18:30 PM',
    source: 'Maintenance',
    status: 'Completed',
    trackedObjects: ['GPU Node', 'Thermal Sensor'],
  },
  {
    title: 'Night Shift Perimeter Review',
    summary:
      'Low-light tracking validated across south sector. One occlusion event logged and cleared.',
    time: '02:11 AM',
    source: 'Vision AI v4.2',
    status: 'Review',
    trackedObjects: ['Vehicle', 'Guard', 'Gate Sensor'],
  },
];

const sampleQueries = [
  {
    prompt: 'Summarize suspicious movement near loading dock B in last 20 minutes.',
    result: 'Detected 2 irregular trajectories, one linked to unknown badge ID.',
    time: '14:46 PM',
  },
  {
    prompt: 'Which tracked objects had repeated path overlap with restricted area?',
    result: 'Backpack, Worker-12, and Forklift-07 crossed overlap threshold.',
    time: '08:21 AM',
  },
  {
    prompt: 'Compare traffic throughput with yesterday same time window.',
    result: 'Throughput is +11.2% with lower idle intervals.',
    time: '08:18 AM',
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/insightvision';
  await mongoose.connect(uri);

  let user = await User.findOne({ email: demoEmail });
  if (!user) {
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    user = await User.create({
      name: 'INSIGHT_USER_01',
      email: demoEmail,
      passwordHash,
    });
    console.log('Created demo user:', demoEmail);
  } else {
    console.log('Demo user already exists:', demoEmail);
  }

  const existingCount = await Detection.countDocuments({ userId: user._id });
  if (existingCount === 0) {
    await Detection.insertMany(
      sampleDetections.map((d) => ({ ...d, userId: user._id }))
    );
    console.log('Inserted sample detections');
  }

  const queryCount = await VlmQuery.countDocuments({ userId: user._id });
  if (queryCount === 0) {
    await VlmQuery.insertMany(
      sampleQueries.map((q) => ({ ...q, userId: user._id }))
    );
    console.log('Inserted sample VLM queries');
  }

  console.log('\nDemo credentials:');
  console.log('  Email:   ', demoEmail);
  console.log('  Password:', demoPassword);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
