const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = 10;

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

    connection.query('CREATE DATABASE IF NOT EXISTS mfu_election', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            process.exit(1);
        }
        console.log('Database created or already exists');

        connection.query('USE mfu_election', (err) => {
            if (err) {
                console.error('Error selecting database:', err);
                process.exit(1);
            }

            const tables = [
                `CREATE TABLE IF NOT EXISTS voters (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    citizen_id VARCHAR(20) UNIQUE NOT NULL,
                    laser_id VARCHAR(20) NOT NULL,
                    status TINYINT DEFAULT 1,
                    has_voted TINYINT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS candidates (
                    candidate_id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    party VARCHAR(100),
                    position VARCHAR(100),
                    policy TEXT,
                    image_url TEXT,
                    email VARCHAR(255) UNIQUE,
                    password VARCHAR(255),
                    status TINYINT DEFAULT 1,
                    vision TEXT,
                    manifesto TEXT,
                    votes INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE TABLE IF NOT EXISTS votes (
                    vote_id INT AUTO_INCREMENT PRIMARY KEY,
                    voter_id INT NOT NULL,
                    candidate_id INT NOT NULL,
                    vote_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (voter_id) REFERENCES voters(id),
                    FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id)
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
                        ensureCandidateColumns(insertDefaultData);
                    }
                });
            });
        });
    });
});

function ensureCandidateColumns(cb) {
    const queries = [
        `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS vision TEXT`,
        `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS manifesto TEXT`,
        `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS votes INT DEFAULT 0`
    ];

    let finished = 0;
    queries.forEach((query) => {
        connection.query(query, (err) => {
            if (err) {
                console.error('Error ensuring candidate column:', err);
            }
            finished++;
            if (finished === queries.length) {
                cb();
            }
        });
    });
}

function insertDefaultData() {
    const staticInserts = [
        { query: 'INSERT IGNORE INTO admins (username, password) VALUES (?, ?)', params: ['admin', bcrypt.hashSync('admin123', BCRYPT_ROUNDS)] },
        { query: 'INSERT IGNORE INTO settings (id, voting_enabled) VALUES (?, ?)', params: [1, 1] }
    ];

    const voterSeedQuery = `
        INSERT INTO voters (citizen_id, laser_id, status, has_voted)
        VALUES (?, ?, 1, 0)
        ON DUPLICATE KEY UPDATE
            laser_id = VALUES(laser_id),
            status = VALUES(status),
            has_voted = VALUES(has_voted)
    `;

    const voterSeeds = Array.from({ length: 52 }, (_, idx) => {
        const citizenBase = 6731501000 + idx;
        const laserBase = 2884000 + idx;
        return {
            citizen_id: `${citizenBase}`,
            laser_id: `GY2${String(laserBase).padStart(7, '0')}`
        };
    });

    const candidateUpsertQuery = `
        INSERT INTO candidates (
            candidate_id, name, party, position, policy, image_url, email, password,
            status, vision, manifesto, votes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            party = VALUES(party),
            position = VALUES(position),
            policy = VALUES(policy),
            image_url = VALUES(image_url),
            email = VALUES(email),
            password = VALUES(password),
            status = VALUES(status),
            vision = VALUES(vision),
            manifesto = VALUES(manifesto),
            votes = VALUES(votes)
    `;

    const candidateSeeds = [
        {
            candidate_id: 1,
            name: 'Mr. Thitipong Siri',
            party: 'Bright Horizon',
            position: 'President',
            policy: 'Expand digital learning studios and partner labs with industry leaders.',
            image_url: 'https://randomuser.me/api/portraits/men/21.jpg',
            email: 'thitipong@mfu.ac.th',
            password: 'SiriSecure!26',
            vision: 'A future-first MFU that embraces emerging technologies and inclusive learning.',
            manifesto: 'Create accessible co-creation spaces where students and faculty can prototype future-ready projects together.',
            votes: 1
        },
        {
            candidate_id: 2,
            name: 'Ms. Anya Raksak',
            party: 'Student Voice',
            position: 'President',
            policy: 'Ensure student council seats reflect every faculty and program.',
            image_url: 'https://randomuser.me/api/portraits/women/44.jpg',
            email: 'anya@mfu.ac.th',
            password: 'VoicePulse$26',
            vision: 'Every student is represented and empowered with transparent dialogue and support.',
            manifesto: 'Host monthly town halls with clear follow-up tracking and democratize council budgets.',
            votes: 0
        },
        {
            candidate_id: 3,
            name: 'Dr. Somchai Wang',
            party: 'Innovation MFU',
            position: 'President',
            policy: 'Improve digital services with AI-assisted assistants for campus services.',
            image_url: 'https://randomuser.me/api/portraits/men/32.jpg',
            email: 'somchai@mfu.ac.th',
            password: 'InnovateEdge#26',
            vision: 'An innovative MFU leading regional education through collaborative AI research.',
            manifesto: 'Launch an innovation hub where interdisciplinary teams co-create human-centered digital tools.',
            votes: 0
        },
        {
            candidate_id: 4,
            name: 'Dr. Sirin Phayap',
            party: 'Innovation MFU',
            position: 'President',
            policy: 'Improve student digital services',
            image_url: 'https://randomuser.me/api/portraits/men/44.jpg',
            email: 'sirin@mfu.ac.th',
            password: 'DigitalPioneer@26',
            vision: 'My candidacy is built on the belief that a university should champion digital equity.',
            manifesto: 'Deploy hands-on labs and learning pods so every student masters the AI-enabled workplace.',
            votes: 0
        },
        {
            candidate_id: 5,
            name: 'Ms. Piyawan Raksak',
            party: 'Student Voice',
            position: 'President',
            policy: 'Better student representation',
            image_url: 'https://randomuser.me/api/portraits/women/65.jpg',
            email: 'piyawan@mfu.ac.th',
            password: 'CommunityFirst%26',
            vision: 'A compassionate campus community centered on wellbeing, trust, and inclusion.',
            manifesto: 'Fund peer counselling, expand wellness programs, and open transparent budget channels.',
            votes: 0
        },
        {
            candidate_id: 6,
            name: 'Mr. Thanat P.',
            party: 'Green Future',
            position: 'President',
            policy: 'Making MFU a sustainable university',
            image_url: 'https://randomuser.me/api/portraits/men/65.jpg',
            email: 'thanat@mfu.ac.th',
            password: 'GreenFuture#26',
            vision: 'A campus that honours nature and student wellbeing every day.',
            manifesto: 'Implement campus-wide zero-waste initiatives and rewild shared learning spaces.',
            votes: 0
        }
    ];

    let pending = staticInserts.length + voterSeeds.length + candidateSeeds.length;

    function maybeFinish() {
        pending -= 1;
        if (pending === 0) {
            console.log('✅ Database setup complete!');
            connection.end();
            process.exit(0);
        }
    }

    staticInserts.forEach((entry, idx) => {
        connection.query(entry.query, entry.params, (err) => {
            if (err) {
                console.error(`Error inserting static data ${idx + 1}:`, err);
            } else {
                console.log(`Static data ${idx + 1} inserted`);
            }
            maybeFinish();
        });
    });

    voterSeeds.forEach((voter, idx) => {
        const hashedLaserId = bcrypt.hashSync(voter.laser_id, BCRYPT_ROUNDS);
        connection.query(voterSeedQuery, [voter.citizen_id, hashedLaserId], (err) => {
            if (err) {
                console.error(`Voter seed error ${idx + 1}:`, err);
            } else {
                console.log(`Seeded voter ${voter.citizen_id}`);
            }
            maybeFinish();
        });
    });

    candidateSeeds.forEach((candidate, idx) => {
        const params = [
            candidate.candidate_id,
            candidate.name,
            candidate.party,
            candidate.position,
            candidate.policy,
            candidate.image_url,
            candidate.email,
            bcrypt.hashSync(candidate.password, BCRYPT_ROUNDS),
            1,
            candidate.vision,
            candidate.manifesto,
            candidate.votes
        ];

        connection.query(candidateUpsertQuery, params, (err) => {
            if (err) {
                console.error(`Candidate seed error for ${candidate.name}:`, err);
            } else {
                console.log(`Seeded ${candidate.name}`);
            }
            maybeFinish();
        });
    });
}
