// app.js - Full CRUD API with Authentication and JWTs

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const app = express();
const port = 3000;

// --- Mongoose Connection Setup ---
require('dotenv').config();
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET; // Get JWT Secret from .env

mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB Atlas!'))
    .catch(err => console.error('Could not connect to MongoDB:', err));


// --- Mongoose Schema & Model ---
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);


// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// JWT Authentication Middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
      return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
          return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
  });
}

// A Protected Route to test JWT (GET /api/users/profile)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
      // The user ID is now in req.user.userId from the JWT
      const user = await User.findById(req.user.userId).select('-password');
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'Access granted', user });
  } catch (error) {
      res.status(500).json({ error: 'Server error' });
  }
});


// --- API Routes (CRUD Operations) ---

// 1. READ ALL Users (GET /api/users)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// 2. READ Single User (GET /api/users/:id)
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// 3. CREATE User (POST /api/users) - Now for registration
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).json({ message: 'User created successfully', user: { name: user.name, email: user.email, _id: user._id } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email already exists' });
        }
        res.status(400).json({ error: error.message });
    }
});

// 4. UPDATE User (PUT /api/users/:id)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let updateFields = { name, email };
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }
        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true, runValidators: true }
        ).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User updated successfully', user: { name: user.name, email: user.email, _id: user._id } });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email already exists' });
        }
        res.status(400).json({ error: error.message });
    }
});

// 5. DELETE User (DELETE /api/users/:id)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});


// --- Authentication Routes ---

// User Login (POST /api/users/login) - Now returns a JWT
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Authentication failed. User not found.' });
        }
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Authentication failed. Incorrect password.' });
        }

        // Create a JWT
        const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
        
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// A Protected Route to test JWT (GET /api/users/profile)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Access granted', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`Express server listening at http://localhost:${port}`);
});