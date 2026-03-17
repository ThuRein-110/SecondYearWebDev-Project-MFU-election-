let sidebarOpen = false;

/* ==========================
   SIDEBAR
========================== */

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    document.querySelector('.sidebar')
        .classList.toggle('open', sidebarOpen);
}

/* ==========================
   NAVIGATION
========================== */

function showSection(sectionName, event) {

    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    document
        .getElementById(sectionName + '-section')
        .classList.add('active');

    if (event) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) navItem.classList.add('active');
    }

    if (sidebarOpen) toggleSidebar();

    if (sectionName === "dashboard") loadDashboard();
    if (sectionName === "candidates") loadCandidates();
    if (sectionName === "history") loadHistory();
}

/* ==========================
   DASHBOARD
========================== */

async function loadDashboard(){

    const response = await fetch("/dashboard");
    const data = await response.json();

    if(data.error){
        alert("Dashboard error");
        return;
    }

    document.getElementById("stats").innerHTML = `
        <div class="stat">
            <h4>Total Voters</h4>
            <p>${data.voters}</p>
        </div>

        <div class="stat">
            <h4>Candidates</h4>
            <p>${data.candidates}</p>
        </div>

        <div class="stat">
            <h4>Votes Cast</h4>
            <p>${data.votes}</p>
        </div>

        <div class="stat">
            <h4>Voting %</h4>
            <p>${data.percentage}%</p>
        </div>
    `;

    loadStandings();
}

/* ==========================
   LIVE STANDINGS
========================== */

async function loadStandings(){

    const response = await fetch("/results");
    const standings = await response.json();

    const tbody =
        document.getElementById("standing-table-body");

    if(!Array.isArray(standings)){
        tbody.innerHTML =
        `<tr><td colspan="5">Unable to load standings</td></tr>`;
        return;
    }

    tbody.innerHTML = standings.map((c,index)=>{

        const votes = c.votes || 0;
        const trend = votes > 0 ? "⬆️" : "➖";

        return `
        <tr>
            <td>${index+1}</td>

            <td>
                <strong>${c.name}</strong><br>
                <small>${c.party || "Independent"}</small>
            </td>

            <td>${c.position || "Candidate"}</td>

            <td>${votes}</td>

            <td>${trend}</td>
        </tr>
        `;

    }).join("");

}

/* ==========================
   CANDIDATES
========================== */

async function loadCandidates(){

    const response = await fetch("/candidates");

    if(!response.ok){
        console.error("Server error");
        return;
    }

    const candidates = await response.json();

    const container =
        document.getElementById("candidates");

    if(!Array.isArray(candidates) || candidates.length === 0){
        container.innerHTML =
        "<p>No candidates available.</p>";
        return;
    }

    container.innerHTML =
    candidates.map(c => {

        const votes = c.votes || 0;

        const image =
        c.image_url && c.image_url.startsWith("http")
        ? c.image_url
        : `https://randomuser.me/api/portraits/men/${Math.floor(Math.random()*90)}.jpg`;

        return `
        <div class="candidate-card">

            <img src="${image}"
            class="candidate-photo"
            onerror="this.src='https://randomuser.me/api/portraits/men/1.jpg'">

            <div class="candidate-badge">
                CAN-${String(c.candidate_id).padStart(3,"0")}
            </div>

            <h3>${c.name}</h3>

            <p class="candidate-party">
                ${c.party || "Independent"}
            </p>

            <p class="candidate-position">
                ${c.position || "Candidate"}
            </p>

            <p class="candidate-policy">
                "${c.policy}"
            </p>

            <div class="vote-count">
                🗳 ${votes} Votes
            </div>

            <div class="candidate-buttons">

                <button class="profile-btn"
                onclick='viewProfile(${JSON.stringify(c)})'>
                View Profile
                </button>

                <button class="vote-btn"
                onclick="voteCandidate(${c.candidate_id}, this)">
                Vote
                </button>

            </div>

        </div>
        `;

    }).join("");

}

/* ==========================
   PROFILE VIEW
========================== */

function viewProfile(candidate){

const modal = document.createElement("div");

modal.className = "profile-modal";

modal.innerHTML = `

<div class="profile-box">

<h2>${candidate.name}</h2>

<p><strong>Party:</strong> ${candidate.party}</p>

<p><strong>Position:</strong> ${candidate.position}</p>

<p><strong>Policy:</strong></p>

<p>${candidate.policy}</p>

<br>

<button onclick="voteCandidate(${candidate.candidate_id}, this)">
Vote for this candidate
</button>

<button onclick="this.closest('.profile-modal').remove()">
Close
</button>

</div>
`;

document.body.appendChild(modal);

}

/* ==========================
   VOTE
========================== */

async function voteCandidate(candidateId,button){

button.disabled = true;

const confirmVote =
confirm("Are you sure you want to vote for this candidate?");

if(!confirmVote){
button.disabled = false;
return;
}

const response = await fetch("/vote",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({candidate_id:candidateId})
});

const result = await response.json();

if(result.success){

alert("Vote successfully recorded!");

loadDashboard();
loadCandidates();

}else{

alert(result.error || "Voting failed");

button.disabled = false;

}

}

/* ==========================
   HISTORY
========================== */

async function loadHistory(){

const response =
await fetch("/voter/history");

const history = await response.json();

document.getElementById("history").innerHTML =
history.length
? history.map(h =>
`<p>You voted for ${h.name} on ${h.vote_time}</p>`
).join("")
: "<p>You have not voted yet.</p>";

}

/* ==========================
   LOGOUT
========================== */

async function logout(){

await fetch("/logout",{method:"POST"});

window.location.href = "login.html";

}

/* ==========================
   INIT
========================== */

document.addEventListener("DOMContentLoaded",()=>{

loadDashboard();

});