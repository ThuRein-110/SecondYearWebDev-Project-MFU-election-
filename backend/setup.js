const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL');

    // Create database
    connection.query('CREATE DATABASE IF NOT EXISTS mfu_election', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            process.exit(1);
        }
        console.log('Database created or already exists');

        // Use the database
        connection.query('USE mfu_election', (err) => {
            if (err) {
                console.error('Error selecting database:', err);
                process.exit(1);
            }

            // Create tables
            const tables = [
                `CREATE TABLE IF NOT EXISTS voters (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    citizen_id VARCHAR(13) UNIQUE NOT NULL,
                    laser_id VARCHAR(20) NOT NULL,
                    status TINYINT DEFAULT 1,
                    has_voted TINYINT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS candidates (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    candidate_id VARCHAR(10) UNIQUE,
                    name VARCHAR(100) NOT NULL,
                    party VARCHAR(100),
                    position VARCHAR(100),
                    policy TEXT,
                    image_url TEXT,
                    status TINYINT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS votes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    voter_id INT NOT NULL,
                    candidate_id INT NOT NULL,
                    vote_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (voter_id) REFERENCES voters(id),
                    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
                )`,
                `CREATE TABLE IF NOT EXISTS admins (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL
                )`,
                `CREATE TABLE IF NOT EXISTS settings (
                    id INT PRIMARY KEY DEFAULT 1,
                    voting_enabled TINYINT DEFAULT 1
                )`
            ];

            let completed = 0;
            tables.forEach((table, index) => {
                connection.query(table, (err) => {
                    if (err) {
                        console.error(`Error creating table ${index + 1}:`, err);
                    } else {
                        console.log(`Table ${index + 1} created successfully`);
                    }
                    completed++;
                    if (completed === tables.length) {
                        insertDefaultData();
                    }
                });
            });

            function insertDefaultData() {
                const data = [
                    ['INSERT IGNORE INTO admins (username, password) VALUES (?, ?)', ['admin', 'admin123']],
                    ['INSERT IGNORE INTO settings (id, voting_enabled) VALUES (?, ?)', [1, 1]],
                    ['INSERT IGNORE INTO voters (citizen_id, laser_id) VALUES (?, ?)', ['1234567890123', 'AB1234']]
                ];

                let dataCompleted = 0;
                data.forEach((query, idx) => {
                    connection.query(query[0], query[1], (err) => {
                        if (err) {
                            console.error(`Error inserting data ${idx + 1}:`, err);
                        } else {
                            console.log(`Data ${idx + 1} inserted successfully`);
                        }
                        dataCompleted++;
                        if (dataCompleted === data.length) {
                            console.log('✅ Database setup complete!');
                            connection.end();
                            process.exit(0);
                        }
                    });
                });
            }
        });
    });
});
