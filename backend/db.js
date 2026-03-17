const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mfu_election'
});

db.connect((err) => {
    if(err){
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to MySQL");
    }
});

// Handle connection errors after initial connection
db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('Database connection was closed.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        console.error('Database had a fatal error.');
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_CLOSE') {
        console.error('Database connection was manually closed.');
    }
});

module.exports = db;