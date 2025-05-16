const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and CORS
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Request body:', JSON.stringify(req.body));
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Get current directory structure
console.log('Current directory:', __dirname);
console.log('Files in current directory:', fs.readdirSync(__dirname));

// Serve static files from the current directory (as all files are now here)
app.use(express.static(__dirname));

// Add a specific route for the root path to ensure index.html is served
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB connection string
const uri = "mongodb+srv://Rizwan:dNifRpAvkimLh8i@poolingssystem.bbnpyiz.mongodb.net/pollingApp?retryWrites=true&w=majority&appName=PoolingsSystem";
const client = new MongoClient(uri);

// Database and collection names
const dbName = 'pollingApp';
const pollsCollection = 'polls';
const usersCollection = 'users';

// Debug routes to check if API is working
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API is working correctly' });
});

// GET - Fetch all polls
app.get('/api/polls', async (req, res) => {
  try {
    const db = client.db(dbName);
    const polls = await db.collection(pollsCollection).find({}).toArray();
    console.log('Fetched polls:', polls.length);
    res.json(polls);
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ message: 'Error fetching polls', error: error.message });
  }
});

// GET - Fetch a specific poll
app.get('/api/polls/:id', async (req, res) => {
  try {
    const db = client.db(dbName);
    const poll = await db.collection(pollsCollection).findOne({ _id: new ObjectId(req.params.id) });
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    res.json(poll);
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ message: 'Error fetching poll', error: error.message });
  }
});

// POST - Create a new poll
app.post('/api/polls', async (req, res) => {
  try {
    console.log('Received poll creation request with body:', req.body);
    
    const { question, options } = req.body;
    
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      console.log('Invalid poll data received');
      return res.status(400).json({ message: 'Invalid poll data. Question and at least 2 options are required.' });
    }
    
    const votes = Array(options.length).fill(0);
    
    const db = client.db(dbName);
    const result = await db.collection(pollsCollection).insertOne({
      question,
      options,
      votes,
      createdAt: new Date()
    });
    
    console.log('Poll created with ID:', result.insertedId);
    
    res.status(201).json({ 
      message: 'Poll created successfully',
      pollId: result.insertedId
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ message: 'Error creating poll', error: error.message });
  }
});

// PUT - Update a poll (vote)
app.put('/api/polls/:id/vote', async (req, res) => {
  try {
    const { optionIndex, userId } = req.body;
    console.log('Vote request received:', req.params.id, optionIndex, userId);
    
    if (optionIndex === undefined || !userId) {
      return res.status(400).json({ message: 'Option index and user ID are required' });
    }
    
    const db = client.db(dbName);
    
    // Get the poll
    const poll = await db.collection(pollsCollection).findOne({ _id: new ObjectId(req.params.id) });
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'Invalid option index' });
    }
    
    // Check if user has already voted on this poll
    const votedUser = await db.collection(usersCollection).findOne({
      userId: userId,
      [`votedPolls.${req.params.id}`]: { $exists: true }
    });
    
    if (votedUser) {
      return res.status(400).json({ message: 'User has already voted on this poll' });
    }
    
    // Update the vote count
    const updateVotes = [...poll.votes];
    updateVotes[optionIndex]++;
    
    await db.collection(pollsCollection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { votes: updateVotes } }
    );
    
    // Record the user's vote
    await db.collection(usersCollection).updateOne(
      { userId: userId },
      { 
        $set: { [`votedPolls.${req.params.id}`]: true },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    
    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ message: 'Error recording vote', error: error.message });
  }
});

// DELETE - Delete a poll
app.delete('/api/polls/:id', async (req, res) => {
  try {
    const db = client.db(dbName);
    const result = await db.collection(pollsCollection).deleteOne({ _id: new ObjectId(req.params.id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    res.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ message: 'Error deleting poll', error: error.message });
  }
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    // Create database if it doesn't exist
    const db = client.db(dbName);
    
    // Create collections if they don't exist
    if (!(await db.listCollections({ name: pollsCollection }).hasNext())) {
      await db.createCollection(pollsCollection);
    }
    
    if (!(await db.listCollections({ name: usersCollection }).hasNext())) {
      await db.createCollection(usersCollection);
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await client.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

startServer(); 