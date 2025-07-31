// app.js - Full CRUD API with Express.js and SQLite

const express = require('express');
const app = express();
const port = 3000;

// --- Import the database connection ---
// Make sure database.js has been run at least once to create users.db
const db = require('./database');

// --- Middleware ---
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Serve static files from the 'public' directory
const path = require('path'); // Node.js built-in path module
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes (CRUD Operations) ---

// 1. READ ALL Users (GET /api/users)
app.get('/api/users', (req, res) => {
  db.all("SELECT id, name, email FROM users", [], (err, rows) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    res.json(rows); // Send all users from the database
  });
});

// 2. READ Single User (GET /api/users/:id)
app.get('/api/users/:id', (req, res) => {
  const id = req.params.id; // ID from route parameter

  db.get("SELECT id, name, email FROM users WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    if (row) {
      res.json(row); // Send the found user
    } else {
      res.status(404).json({ "message": "User not found" }); // User not found
    }
  });
});

// 3. CREATE User (POST /api/users)
app.post('/api/users', (req, res) => {
  const { name, email } = req.body; // Destructure name and email from request body

  // Basic validation
  if (!name || !email) {
    return res.status(400).json({ "message": "Name and email are required" });
  }

  const insert = 'INSERT INTO users (name, email) VALUES (?,?)';
  db.run(insert, [name, email], function (err) { // Use function keyword for 'this' context
    if (err) {
      if (err.message.includes("UNIQUE constraint failed: users.email")) {
        return res.status(409).json({ "message": "Email already exists" }); // 409 Conflict
      }
      res.status(500).json({ "error": err.message });
      return;
    }
    // 'this.lastID' contains the ID of the newly inserted row
    res.status(201).json({
      "message": "User created successfully",
      "user": { id: this.lastID, name, email }
    });
  });
});

// 4. UPDATE User (PUT /api/users/:id)
app.put('/api/users/:id', (req, res) => {
  const id = req.params.id;
  const { name, email } = req.body;

  if (!name && !email) {
    return res.status(400).json({ "message": "No valid update data provided (name or email required)." });
  }

  let updateQuery = 'UPDATE users SET ';
  const params = [];
  const fields = [];

  if (name) {
    fields.push('name = ?');
    params.push(name);
  }
  if (email) {
    fields.push('email = ?');
    params.push(email);
  }

  updateQuery += fields.join(', ') + ' WHERE id = ?';
  params.push(id); // Add ID to the end of parameters

  db.run(updateQuery, params, function (err) { // Use function keyword for 'this' context
    if (err) {
      if (err.message.includes("UNIQUE constraint failed: users.email")) {
        return res.status(409).json({ "message": "Email already exists" }); // 409 Conflict
      }
      res.status(500).json({ "error": err.message });
      return;
    }
    if (this.changes === 0) { // If no rows were changed, user was not found
      res.status(404).json({ "message": "User not found" });
    } else {
      res.json({ "message": "User updated successfully" });
    }
  });
});

// 5. DELETE User (DELETE /api/users/:id)
app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM users WHERE id = ?", id, function (err) { // Use function keyword for 'this' context
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    if (this.changes === 0) { // If no rows were deleted, user was not found
      res.status(404).json({ "message": "User not found" });
    } else {
      res.json({ "message": "User deleted successfully" });
    }
  });
});


// --- Server Start ---
app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
  console.log('\n--- API Endpoints (Test using curl in a NEW terminal) ---');
  console.log('GET  /api/users                 - Get all users');
  console.log('GET  /api/users/1               - Get user with ID 1');
  console.log('POST /api/users                 - Create new user (send JSON body)');
  console.log('PUT  /api/users/1               - Update user with ID 1 (send JSON body)');
  console.log('DELETE /api/users/1             - Delete user with ID 1');
  console.log('\nReminder: Server must be running in one terminal, run curl commands in another.');
});