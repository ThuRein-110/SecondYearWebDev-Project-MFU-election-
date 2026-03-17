// ===============================
// DEBUG: CHECK JS LOAD
// ===============================
console.log("Candidate Profile JS Loaded");


// ===============================
// GET ID FROM URL
// ===============================
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

let currentCandidateId = null;


// ===============================
// LOAD PROFILE
// ===============================
async function loadProfile() {

    if (!id) {
        alert("No candidate ID found in URL");
        console.error("Missing ID");
        return;
    }

    console.log("Fetching candidate ID:", id);

    try {

const res = await fetch(`http://localhost:3000/candidates/${id}`, {
    credentials: "include"
});
        console.log("Response:", res);

        const data = await res.json();
        console.log("API Data:", data);

        // Handle array OR object response
        const c = Array.isArray(data) ? data[0] : data;

        if (!c || c.error) {
            alert("Candidate not found");
            return;
        }

        // Save ID
        currentCandidateId = c.id || c.candidate_id;

        // ===============================
        // SET DATA TO UI
        // ===============================
        document.getElementById("profile-img").src =
            c.image_url || "https://via.placeholder.com/100";

        document.getElementById("name").innerText =
            c.name || "Unknown Candidate";

        document.getElementById("tagline").innerText =
            c.policy || "No policy available";

        document.getElementById("vision").innerText =
            c.vision && c.vision !== "NULL"
                ? c.vision
                : "No vision available";

        document.getElementById("manifesto").innerText =
            c.manifesto && c.manifesto !== "NULL"
                ? c.manifesto
                : "No manifesto available";

        document.getElementById("votes").innerText =
            (c.votes || 0) + " Votes";

        // ===============================
        // STATIC PILLARS
        // ===============================
        document.getElementById("pillars").innerHTML = `
            <div class="pillar-card">
                <h4>Academic Innovation</h4>
                <p>Investing in AI-driven research facilities.</p>
            </div>

            <div class="pillar-card">
                <h4>Digital Campus 2025</h4>
                <p>Modern digital infrastructure.</p>
            </div>

            <div class="pillar-card">
                <h4>Sustainable Future</h4>
                <p>Eco-friendly campus initiatives.</p>
            </div>
        `;

        setupVoteButton();

    } catch (err) {
        console.error("Fetch Error:", err);
        alert("Failed to load candidate");
    }
}


// ===============================
// VOTE FUNCTION
// ===============================
function setupVoteButton() {

    const btn = document.getElementById("voteBtn");

    if (!btn) {
        console.error("Vote button not found");
        return;
    }


}


// ===============================
// INIT
// ===============================
loadProfile();