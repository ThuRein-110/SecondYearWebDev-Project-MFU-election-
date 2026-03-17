const db = require('./db');

console.log('Testing dashboard queries...\n');

const queries = {
    voters: "SELECT COUNT(*) AS count FROM voters",
    candidates: "SELECT COUNT(*) AS count FROM candidates WHERE status=1",
    votes: "SELECT COUNT(*) AS count FROM votes",
    voting_enabled: "SELECT voting_enabled FROM settings WHERE id=1"
};

Object.keys(queries).forEach(key => {
    console.log(`Running ${key} query...`);
    db.query(queries[key], (err, result) => {
        if (err) {
            console.error(`❌ ${key} query failed:`, err.message);
        } else {
            console.log(`✅ ${key} result:`, result);
        }
        
        if (key === 'voting_enabled') {
            setTimeout(() => {
                db.end();
                process.exit(0);
            }, 100);
        }
    });
});

setTimeout(() => {
    console.error('⚠️  Query timeout');
    db.end();
    process.exit(1);
}, 5000);
