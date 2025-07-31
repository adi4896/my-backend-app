// database.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Users table created or already exists.');
        // Optional: Insert some initial data if the table was just created
        db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
          if (row.count === 0) {
            console.log('Inserting initial user data...');
            const insert = 'INSERT INTO users (name, email) VALUES (?,?)';
            db.run(insert, ['Alice Smith', 'alice@example.com']);
            db.run(insert, ['Bob Johnson', 'bob@example.com']);
            db.run(insert, ['Charlie Brown', 'charlie@example.com']);
            console.log('Initial users inserted.');
          }
        });
      }
    });
  }
});

module.exports = db; // Export the database connection for use in app.js