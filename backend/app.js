const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
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
            req.session.user = {
                type: 'voter',
                voter_id: result[0].voter_id
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

    const { candidate_id , password } = req.body;

    const sql = `
    SELECT * FROM candidates
    WHERE candidate_id=? AND password=? AND status=1
    `;

    db.query(sql,[candidate_id,password],(err,result)=>{

        if(err) return res.json({ success:false });

        if(result.length>0){

            req.session.user={
                type:'candidate',
                candidate_id: result[0].candidate_id
            };

            res.json({ success:true });
        }
        else{
            res.json({ success:false });
        }

    });

});


// Admin login
app.post('/login/admin',(req,res)=>{

    const { username , password } = req.body;

    const sql = `
    SELECT * FROM admins
    WHERE username=? AND password=?
    `;

    db.query(sql,[username,password],(err,result)=>{

        if(err) return res.json({ success:false });

        if(result.length>0){

            req.session.user={
                type:'admin',
                admin_id: result[0].admin_id
            };

            res.json({ success:true });

        }else{
            res.json({ success:false });
        }

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
SELECT candidate_id,name,party,position,policy,image_url
FROM candidates
ORDER BY candidate_id
`;

db.query(sql,(err,result)=>{

if(err){
console.error(err);
return res.json({error:"Database error",details:err.message});
}

res.json(result);

});

});


/* -------------------- VOTE -------------------- */

app.post('/vote',(req,res)=>{

    if(!req.session.user || req.session.user.type!=='voter'){
        return res.json({ success:false , message:"Not voter"});
    }

    const voter_id = req.session.user.voter_id;
    const { candidate_id } = req.body;


    // check voting enabled
    db.query(
        "SELECT voting_enabled FROM settings WHERE id=1",
        (err,settings)=>{

            if(err || settings.length===0 || !settings[0].voting_enabled){
                return res.json({ success:false , message:"Voting closed"});
            }


            // check already voted
            db.query(
                "SELECT * FROM votes WHERE voter_id=?",
                [voter_id],
                (err,result)=>{

                    if(result.length>0){
                        return res.json({ success:false , message:"Already voted"});
                    }


                    // insert vote
                    db.query(
                        "INSERT INTO votes (voter_id,candidate_id) VALUES (?,?)",
                        [voter_id,candidate_id],
                        (err)=>{

                            if(err) return res.json({ success:false });

                            db.query(
                                "UPDATE voters SET has_voted=1 WHERE voter_id=?",
                                [voter_id]
                            );

                            res.json({ success:true });

                        }
                    );

                }
            );

        }
    );

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
        "SELECT voter_id,citizen_id,laser_id,status,has_voted FROM voters",
        (err,result)=>{
            res.json(result);
        }
    );

});


// toggle voter
app.post('/admin/toggle-voter',(req,res)=>{

    const { voter_id , status } = req.body;

    db.query(
        "UPDATE voters SET status=? WHERE voter_id=?",
        [status,voter_id],
        ()=>res.json({ success:true })
    );

});


// get candidates
app.get('/admin/candidates',(req,res)=>{

    db.query(
        "SELECT candidate_id,name,policy,status FROM candidates",
        (err,result)=>{
            res.json(result);
        }
    );

});


// toggle candidate
app.post('/admin/toggle-candidate',(req,res)=>{

    const { candidate_id , status } = req.body;

    db.query(
        "UPDATE candidates SET status=? WHERE candidate_id=?",
        [status,candidate_id],
        ()=>res.json({ success:true })
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

    const { name , policy } = req.body;
    const candidate_id = req.session.user.candidate_id;

    db.query(
        "UPDATE candidates SET name=?,policy=? WHERE candidate_id=?",
        [name,policy,candidate_id],
        ()=>res.json({ success:true })
    );

});
// GET candidate by ID
app.get("/candidates/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT *
        FROM candidates
        WHERE candidate_id = ?
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
/* -------------------- SERVER -------------------- */

app.listen(3000,'0.0.0.0',()=>{
    console.log("Server running on port 3000");
});
