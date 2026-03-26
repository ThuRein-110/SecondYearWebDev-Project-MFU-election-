const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use(session({
    secret: 'mfu-election-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

/* -------------------- LOGIN -------------------- */

// Voter login
app.post('/login/voter', (req, res) => {
    const { citizen_id, laser_id } = req.body;

    const sql = `
    SELECT * FROM voters 
    WHERE citizen_id=? AND laser_id=? AND status=1
    `;

    db.query(sql, [citizen_id, laser_id], (err, result) => {

        if (err) return res.json({ success:false });

        if(result.length > 0){
            const voterId = result[0].voter_id ?? result[0].id ?? result[0].voterId;

            req.session.user = {
                type: 'voter',
                voter_id: voterId
            };

            res.json({ success:true });
        }
        else{
            res.json({ success:false, message:"Invalid voter login" });
        }

    });
});


// Candidate login
app.post('/login/candidate', (req,res)=>{

    const identifier = (req.body.identifier || '').trim();
    const password = (req.body.password || '').trim();

    if(!identifier || !password){
        return res.json({ success:false, message:"Missing credentials" });
    }

    const candidateId = /^[0-9]+$/.test(identifier) ? Number(identifier) : null;
    const sql = candidateId !== null
        ? `SELECT * FROM candidates WHERE (candidate_id=? OR email=?) AND password=? AND status=1 LIMIT 1`
        : `SELECT * FROM candidates WHERE email=? AND password=? AND status=1 LIMIT 1`;

    const params = candidateId !== null
        ? [candidateId, identifier, password]
        : [identifier, password];

    db.query(sql, params, (err,result)=>{

        if(err) return res.json({ success:false, message:"Database error" });

        if(result.length>0){

            req.session.user={
                type:'candidate',
                candidate_id: result[0].candidate_id
            };

            res.json({ success:true });
        }
        else{
            res.json({ success:false, message:"Invalid credentials" });
        }

    });

});


// Admin login
app.post('/login/admin', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password required.' });
    }

    const sql = `
    SELECT * FROM admins
    WHERE username=?
    LIMIT 1
    `;

    db.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('Admin login error', err);
            return res.json({ success: false, message: 'Login failed.' });
        }

        if (result.length === 0) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        const admin = result[0];
        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        req.session.user = {
            type: 'admin',
            admin_id: admin.admin_id || admin.id
        };

        res.json({ success: true });
    });
});


/* -------------------- LOGOUT -------------------- */

app.post('/logout',(req,res)=>{
    req.session.destroy();
    res.json({ success:true });
});


/* -------------------- GET CANDIDATES -------------------- */

app.get('/candidates',(req,res)=>{
    const sql = `
    SELECT
        c.candidate_id,
        c.name,
        c.party,
        c.position,
        c.policy,
        c.image_url,
        COALESCE(vc.votes, 0) AS votes
    FROM candidates c
    LEFT JOIN (
        SELECT candidate_id, COUNT(*) AS votes
        FROM votes
        GROUP BY candidate_id
    ) vc ON c.candidate_id = vc.candidate_id
    WHERE c.status = 1
    ORDER BY c.candidate_id
    `;

    db.query(sql,(err,result)=>{

        if(err){
            console.error(err);
            return res.json({error:"Database error",details:err.message});
        }

        res.json(result);

    });

});


/* -------------------- RESULTS -------------------- */

app.get('/results',(req,res)=>{

    const sql = `
    SELECT 
    c.candidate_id,
    c.name,
    c.party,
    c.position,
    c.policy,
    c.vision,
    c.manifesto,
    c.image_url,
    COUNT(v.vote_id) AS votes
    FROM candidates c
    LEFT JOIN votes v
    ON c.candidate_id = v.candidate_id
    GROUP BY c.candidate_id
    ORDER BY votes DESC
    `;

    db.query(sql,(err,result)=>{

        if(err) return res.json([]);

        res.json(result);

    });

});


/* -------------------- VOTER HISTORY -------------------- */

app.get('/voter/history', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'voter') {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const voter_id =
        req.session.user.voter_id ??
        req.session.user.id ??
        req.session.user.voterId;

    if (!voter_id) {
        return res.json({ success: false, error: "Unable to identify voter" });
    }

    const sql = `
        SELECT
            v.vote_id,
            v.vote_time,
            c.candidate_id,
            c.name,
            c.party,
            c.position,
            c.image_url
        FROM votes v
        JOIN candidates c ON c.candidate_id = v.candidate_id
        WHERE v.voter_id = ?
        ORDER BY v.vote_time DESC
    `;

    db.query(sql, [voter_id], (err, rows) => {
        if (err) {
            console.error("History lookup failed", err);
            return res.json({ success: false, error: "Database error" });
        }

        const history = rows.map((row) => ({
            vote_id: row.vote_id,
            vote_time: row.vote_time,
            candidate_id: row.candidate_id,
            name: row.name,
            party: row.party,
            position: row.position,
            image_url: row.image_url
        }));

        const summary = {
            total_votes: history.length,
            participation_rate: history.length ? 100 : 0,
            active_eligibility: Math.max(0, 1 - history.length)
        };

        res.json({ success: true, history, summary });
    });
});

app.get('/votes/recent', (req, res) => {
    if (!req.session.user || req.session.user.type !== 'voter') {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const limitParam = Number(req.query.limit) || 6;
    const limit = Math.max(3, Math.min(12, limitParam));

    const overallSql = "SELECT COALESCE(SUM(votes),0) AS total FROM candidates";
    db.query(overallSql, (err, totalRows) => {
        if (err) {
            console.error("Total votes lookup failed", err);
            return res.json({ success: false, error: "Database error" });
        }

        const overallVotes = totalRows?.[0]?.total ?? 0;
        const sql = `
            SELECT
                c.candidate_id,
                c.name,
                c.party,
                c.position,
                c.votes AS candidate_votes,
                latest.latest_vote_time
            FROM candidates c
            LEFT JOIN (
                SELECT candidate_id, MAX(vote_time) AS latest_vote_time
                FROM votes
                GROUP BY candidate_id
            ) latest ON latest.candidate_id = c.candidate_id
            ORDER BY c.votes DESC, latest.latest_vote_time DESC
            LIMIT ?
        `;

        db.query(sql, [limit], (err, rows) => {
            if (err) {
                console.error("Recent votes lookup failed", err);
                return res.json({ success: false, error: "Database error" });
            }

            const liveLog = (rows ?? []).map(row => ({
                candidate_id: row.candidate_id,
                name: row.name,
                party: row.party,
                position: row.position,
                candidate_votes: row.candidate_votes ?? 0,
                vote_time: row.latest_vote_time
            }));

            res.json({
                success: true,
                liveLog,
                overall_votes: overallVotes
            });
        });
    });
});


/* -------------------- DASHBOARD -------------------- */

app.get('/dashboard',(req,res)=>{

    if(!req.session.user){
        return res.json({ error:"Not logged in"});
    }

    const data={};

    db.query("SELECT COUNT(*) AS total FROM voters",(err,r1)=>{

        data.voters=r1[0].total;

        db.query("SELECT COUNT(*) AS total FROM candidates",(err,r2)=>{

            data.candidates=r2[0].total;

            db.query("SELECT COUNT(*) AS total FROM votes",(err,r3)=>{

                data.votes=r3[0].total;

                db.query("SELECT voting_enabled FROM settings WHERE id=1",(err,r4)=>{

                    data.voting_enabled = r4.length ? r4[0].voting_enabled : 1;

                    const percent =
                        data.voters>0
                        ? ((data.votes/data.voters)*100).toFixed(2)
                        : 0;

                    data.percentage = percent;

                    res.json(data);

                });

            });

        });

    });

});


/* -------------------- ADMIN -------------------- */

// get voters
app.get('/admin/voters',(req,res)=>{

    if(!req.session.user || req.session.user.type!=='admin'){
        return res.json({ error:"Unauthorized"});
    }

    db.query(
        "SELECT id AS voter_id, citizen_id, laser_id, status, has_voted FROM voters",
        (err,result)=>{
            if(err){
                console.error('Failed to load voters', err);
                return res.json({ error: 'Unable to load voters' });
            }
            res.json(result);
        }
    );

});


// toggle voter
app.post('/admin/toggle-voter',(req,res)=>{

    const voterId = req.body.voter_id ?? req.body.id;
    const status = req.body.status;

    if (!voterId || status === undefined) {
        return res.json({ error: 'Missing payload' });
    }

    db.query(
        "UPDATE voters SET status=? WHERE id=?",
        [status,voterId],
        (err)=>{
            if(err){
                console.error('Failed to toggle voter', err);
                return res.json({ success:false });
            }
            res.json({ success:true });
        }
    );

});

app.post('/admin/register-voter', (req, res) => {
    const { citizen_id, laser_id } = req.body;

    if (!citizen_id || !laser_id) {
        return res.status(400).json({ success: false, message: 'Citizen ID and Laser ID are required.' });
    }

    db.query(
        'INSERT INTO voters (citizen_id, laser_id, status) VALUES (?, ?, 1)',
        [citizen_id, laser_id],
        (err) => {
            if (err) {
                console.error('Failed to register voter', err);
                return res.status(500).json({ success: false, message: 'Unable to register voter.' });
            }
            res.json({ success: true });
        }
    );
});


// get candidates
app.get('/admin/candidates',(req,res)=>{

    db.query(
        "SELECT candidate_id, name, policy, status FROM candidates",
        (err,result)=>{
            if(err){
                console.error('Failed to load candidates', err);
                return res.json({ error: 'Unable to load candidates' });
            }
            res.json(result);
        }
    );

});


// toggle candidate
app.post('/admin/toggle-candidate',(req,res)=>{

    const candidateId = req.body.candidate_id ?? req.body.id;
    const status = req.body.status;

    if (!candidateId || status === undefined) {
        return res.json({ error: 'Missing payload' });
    }

    db.query(
        "UPDATE candidates SET status=? WHERE candidate_id=?",
        [status,candidateId],
        (err)=>{
            if(err){
                console.error('Failed to toggle candidate', err);
                return res.json({ success:false });
            }
            res.json({ success:true });
        }
    );

});


// toggle voting
app.post('/admin/toggle-voting',(req,res)=>{

    const { enabled } = req.body;

    db.query(
        "INSERT INTO settings (id,voting_enabled) VALUES (1,?) ON DUPLICATE KEY UPDATE voting_enabled=?",
        [enabled,enabled],
        ()=>res.json({ success:true })
    );

});


/* -------------------- CANDIDATE UPDATE -------------------- */

app.post('/candidate/update',(req,res)=>{

    if(!req.session.user || req.session.user.type!=='candidate'){
        return res.json({ error:"Unauthorized"});
    }

    const { name , policy, vision, manifesto } = req.body;
    const candidate_id = req.session.user.candidate_id;

    db.query(
        "UPDATE candidates SET name=?,policy=?,vision=?,manifesto=? WHERE candidate_id=?",
        [name,policy,vision,manifesto,candidate_id],
        ()=>res.json({ success:true })
    );

});
app.get('/candidate/profile',(req,res)=>{
    if(!req.session.user || req.session.user.type!=='candidate'){
        return res.status(401).json({ error:"Unauthorized" });
    }

    const candidate_id = req.session.user.candidate_id;
    const sql = `
        SELECT candidate_id, name, party, position, policy, image_url, votes, vision, manifesto
        FROM candidates
        WHERE candidate_id = ?
        LIMIT 1
    `;

    db.query(sql, [candidate_id], (err, result) => {
        if(err){
            console.error("Failed to fetch candidate profile:", err);
            return res.status(500).json({ error:"Unable to load profile" });
        }

        if(result.length === 0){
            return res.status(404).json({ error:"Candidate not found" });
        }

        const row = result[0];
        res.json({
            candidate_id: row.candidate_id,
            name: row.name,
            party: row.party,
            position: row.position,
            policy: row.policy,
            image_url: row.image_url,
            votes: row.votes,
            vision: row.vision,
            manifesto: row.manifesto
        });
    });
});

app.get('/candidate/dashboard',(req,res)=>{
    if(!req.session.user || req.session.user.type!=='candidate'){
        return res.status(401).json({ error:"Unauthorized" });
    }

    const candidateId = req.session.user.candidate_id;
    const sql = `
        SELECT candidate_id, name, policy, votes, image_url, position, party
        FROM candidates
    `;

    db.query(sql, (err, candidates) => {
        if(err){
            console.error("Dashboard query failed:", err);
            return res.status(500).json({ error:"Unable to load dashboard" });
        }

        const totalVotes = candidates.reduce((sum,row)=>sum + (row.votes ?? 0), 0);
        const sorted = [...candidates].sort((a,b)=> (b.votes ?? 0) - (a.votes ?? 0));

        const leaderboard = sorted.slice(0,5).map((row,index)=>{
            const nextVotes = sorted[index + 1]?.votes ?? row.votes ?? 0;
            const trendValue = Math.max(Math.round(((row.votes ?? 0) - nextVotes) / Math.max(row.votes ?? 1, 1) * 100), 0);
            return {
                rank: index + 1,
                name: row.name,
                votes: row.votes ?? 0,
                trend: (trendValue >= 0 ? '+' : '') + trendValue + '%'
            };
        });

        const candidate = candidates.find(c => c.candidate_id === candidateId);
        const rank = sorted.findIndex(c => c.candidate_id === candidateId) + 1;

        const hourlyLabels = ['08:00','10:00','12:00','14:00','16:00','18:00','20:00'];
        const hourly = hourlyLabels.map((label,index)=>{
            const pct = (index + 1) / hourlyLabels.length;
            const votes = Math.round((candidate?.votes ?? 0) * pct);
            return { label, votes };
        });

        db.query("SELECT COUNT(*) AS total FROM voters WHERE status=1", (err2, voterRows) => {
            const totalVoters = (voterRows?.[0]?.total) ?? 1;
            const turnoutPercent = totalVotes > 0
                ? Math.min(100, Math.round((totalVotes / totalVoters) * 100))
                : 0;

            const recentActivity = [
                `${candidate?.name || 'Candidate'} gained ${Math.max(Math.round((candidate?.votes ?? 0) * 0.05), 1)} votes in the last hour.`,
                `Ranking updated: You are now #${rank}.`,
                `Your vision "${candidate?.policy || 'Campaign platform'}" reached ${Math.max(Math.round((candidate?.votes ?? 0) * 0.5), 50)} supporters.`
            ];

            res.json({
                totalVotes,
                rank,
                votes: candidate?.votes ?? 0,
                name: candidate?.name,
                policy: candidate?.policy,
                vision: candidate?.policy,
                image_url: candidate?.image_url,
                goalTarget: 60,
                leaderboard,
                hourlyPerformance: hourly,
                turnoutPercent,
                recentActivity,
                candidateId: candidate?.candidate_id
            });
        });
    });
});
// GET candidate by ID
app.get("/candidates/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM candidates
        WHERE candidate_id = ?
        LIMIT 1
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.error(err);
            return res.json({ error: "Database error" });
        }

        if (result.length === 0) {
            return res.json({ error: "Candidate not found" });
        }

        res.json(result[0]);
    });
});
// ===============================
// VOTE API (REAL STORAGE)
// ===============================
app.post('/vote', (req, res) => {

    const candidateIdentifier = req.body.candidate_id;

    if (!candidateIdentifier) {
        return res.json({ success: false, message: "Candidate missing" });
    }

    if (!req.session.user || req.session.user.type !== 'voter') {
        return res.json({ success: false, message: "Not authenticated as voter" });
    }

    const voter_id =
        req.session.user.voter_id ??
        req.session.user.id ??
        req.session.user.voterId;

    if (!voter_id) {
        return res.json({ success: false, message: "Unable to determine voter identity" });
    }

    db.query("SELECT voting_enabled FROM settings WHERE id=1", (settingErr, settings) => {

        const votingEnabled =
            settingErr
                ? true
                : settings.length === 0
                    ? true
                    : Boolean(settings[0].voting_enabled);

        if (!votingEnabled) {
            return res.json({ success: false, message: "Voting closed" });
        }

        const checkSql = "SELECT * FROM votes WHERE voter_id = ?";

        db.query(checkSql, [voter_id], (err, result) => {

            if (err) {
                console.error(err);
                return res.json({ success: false, message: "Database error" });
            }

            if (result.length > 0) {
                return res.json({ success: false, message: "You already voted" });
            }

            const candidateSql = `
                SELECT candidate_id
                FROM candidates
                WHERE candidate_id = ?
                LIMIT 1
            `;

            db.query(candidateSql, [candidateIdentifier], (findErr, candidates) => {

                if (findErr || !Array.isArray(candidates) || candidates.length === 0) {
                    console.error("Candidate lookup failed", findErr);
                    return res.json({ success: false, message: "Candidate not found" });
                }

                const insertSql = `
                    INSERT INTO votes (voter_id, candidate_id)
                    VALUES (?, ?)
                `;

                db.query(insertSql, [voter_id, candidateIdentifier], (insertErr, insertResult) => {

                    if (insertErr) {
                        console.error(insertErr);
                        return res.json({ success: false, message: "Unable to record vote" });
                    }

                    const voteId = insertResult?.insertId ?? null;

                    db.query(
                        "UPDATE candidates SET votes = votes + 1 WHERE candidate_id = ?",
                        [candidateIdentifier],
                        (updateErr) => {
                            if (updateErr) {
                                console.error("Failed to update candidate vote count:", updateErr);
                                return res.json({ success: false, message: "Unable to update totals" });
                            }
                            db.query(
                                "UPDATE voters SET has_voted = 1 WHERE id = ?",
                                [voter_id],
                                (voterUpdateErr) => {
                                    if (voterUpdateErr) {
                                        console.error("Failed to flag voter as voted", voterUpdateErr);
                                    }
                                }
                            );
                            res.json({ success: true, vote_id: voteId, candidate_id: candidateIdentifier });
                        }
                    );
                });
            });
        });
    });
});
/* -------------------- SERVER -------------------- */

app.listen(3000,'0.0.0.0',()=>{
    console.log("Server running on port 3000");
});
