document.addEventListener("DOMContentLoaded", () => {
    const voteStatusEl = document.getElementById("vote-status");
    const voteBtn = document.getElementById("voteBtn");
    const rankingTextEl = document.getElementById("ranking-text");
    const policySummaryEl = document.getElementById("policy-summary");
    const partyChip = document.getElementById("party");
    const positionChip = document.getElementById("position");
    const taglineEl = document.getElementById("tagline");
    const votesEl = document.getElementById("votes");
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    let currentCandidateId = null;

    console.log("Candidate Profile JS loaded, candidate ID:", id);

    if (!voteBtn) {
        console.error("Vote button missing");
        return;
    }

    setVoteStatus("Loading candidate information...", "info");
    setupVoteButton();
    loadProfile();

    async function loadProfile() {
        const targetId = await resolveCandidateIdentifier();

        if (!targetId) {
            setVoteStatus("Unable to determine a valid candidate.", "error");
            return;
        }

        try {
            const res = await fetch(`/candidates/${targetId}`, { credentials: "include" });
            const data = await res.json();
            const candidate = Array.isArray(data) ? data[0] : data;

            if (!candidate || candidate.error) {
                setVoteStatus("Candidate not found.", "error");
                return;
            }

            currentCandidateId = candidate.candidate_id;
            const policyText = candidate.policy && candidate.policy !== "NULL" ? candidate.policy.trim() : "Policy details coming soon.";
            const summaryText = policyText.split(/[.!?]/).find(Boolean) || "Committed to MFU.";

            document.getElementById("profile-img").src =
                candidate.image_url || "https://via.placeholder.com/120";
            document.getElementById("name").innerText =
                candidate.name || "Unknown Candidate";
            document.getElementById("candidate-id").innerText =
                candidate.candidate_id ? `CAN-${String(candidate.candidate_id).padStart(3, "0")}` : "";
            if (partyChip) {
                partyChip.innerText = candidate.party || "Independent";
            }
            if (positionChip) {
                positionChip.innerText = candidate.position || "Student Leader";
            }
            if (taglineEl) {
                taglineEl.innerText = `${summaryText.trim().replace(/\.$/, "")} · Inspired leadership at MFU.`;
            }
            if (policySummaryEl) {
                policySummaryEl.innerText = policyText;
            }
            if (votesEl) {
                votesEl.innerText = `${candidate.votes || 0} Votes`;
            }
            if (rankingTextEl) {
                rankingTextEl.innerText = candidate.position
                    ? `Running for ${candidate.position}`
                    : "Candidate profile";
            }
            document.getElementById("vision").innerText =
                candidate.vision && candidate.vision !== "NULL"
                    ? candidate.vision
                    : "No vision available.";
            document.getElementById("manifesto").innerText =
                candidate.manifesto && candidate.manifesto !== "NULL"
                    ? candidate.manifesto
                    : "No manifesto available.";

            document.getElementById("pillars").innerHTML = `
                <div class="pillar-card">
                    <h4>Academic Innovation</h4>
                    <p>Investing in AI-driven research facilities.</p>
                </div>
                <div class="pillar-card">
                    <h4>Digital Campus 2025</h4>
                    <p>Modern digital infrastructure and learning labs.</p>
                </div>
                <div class="pillar-card">
                    <h4>Sustainable Future</h4>
                    <p>Eco-friendly campus initiatives backed by students.</p>
                </div>
            `;

            setVoteStatus("Candidate loaded. Vote when ready.", "success");
        } catch (err) {
            console.error("Fetch Error:", err);
            setVoteStatus("Unable to load candidate. Please refresh.", "error");
        }
    }

    async function resolveCandidateIdentifier() {
        try {
            const res = await fetch("/candidates");
            if (!res.ok) {
                throw new Error("Unable to fetch candidate list");
            }
            const list = await res.json();

            if (!Array.isArray(list) || list.length === 0) {
                setVoteStatus("No candidates are available right now.", "error");
                return null;
            }

            const normalizedId = id ? id.trim() : "";
            const match = normalizedId
                ? list.find((candidate) => String(candidate.candidate_id) === normalizedId)
                : null;

            const resolved = match ? match.candidate_id : list[0].candidate_id;

            if (resolved) {
                window.history.replaceState(null, "", `candidate-profile.html?id=${resolved}`);
            }

            return resolved;
        } catch (err) {
            console.error("Candidate list load failed", err);
            setVoteStatus("Unable to load candidate list.", "error");
            return null;
        }
    }

    function setupVoteButton() {
        voteBtn.addEventListener("click", async () => {
            if (!currentCandidateId) {
                setVoteStatus("Candidate data still loading. Hold on.", "info");
                return;
            }

            const originalLabel = voteBtn.innerHTML;
            voteBtn.disabled = true;
            voteBtn.innerText = "Submitting...";
            setVoteStatus("Submitting vote...", "info");

            try {
                await vote(currentCandidateId);
            } finally {
                voteBtn.disabled = false;
                voteBtn.innerHTML = originalLabel;
            }
        });
    }

    async function vote(candidate_id) {
        try {
            const res = await fetch("/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ candidate_id })
            });

            const data = await res.json();
            console.log("Vote response:", data);

            if (data.success) {
                storeVoteLocally(candidate_id);
                try {
                    localStorage.setItem('return_anchor', '#candidates-section');
                } catch (err) {
                    sessionStorage.setItem('return_anchor', '#candidates-section');
                }
                window.location.href = "receipt.html";
            } else {
                setVoteStatus(data.message || "Vote failed. Please try again.", "error");
            }
        } catch (err) {
            console.error("Vote request failed", err);
            setVoteStatus("Unable to submit vote. Please try again later.", "error");
        }
    }

    function storeVoteLocally(candidate_id) {
        if (typeof cacheVotedCandidate === "function") {
            cacheVotedCandidate(candidate_id);
        }
    }

    function setVoteStatus(message, level = "info") {
        if (!voteStatusEl) return;
        voteStatusEl.textContent = message;
        voteStatusEl.dataset.level = level;
    }
});
