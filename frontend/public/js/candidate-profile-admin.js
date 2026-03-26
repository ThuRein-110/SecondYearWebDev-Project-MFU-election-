document.addEventListener("DOMContentLoaded", () => {
    const statusMessageEl = document.getElementById("admin-status");
    const rankingTextEl = document.getElementById("ranking-text");
    const policySummaryEl = document.getElementById("policy-summary");
    const partyChip = document.getElementById("party");
    const positionChip = document.getElementById("position");
    const taglineEl = document.getElementById("tagline");
    const votesEl = document.getElementById("votes");
    const statusChipEl = document.getElementById("candidate-status-chip");
    const statusTextEl = document.getElementById("candidate-status-text");
    const partyTextEl = document.getElementById("candidate-party-text");
    const positionTextEl = document.getElementById("candidate-position-text");
    const params = new URLSearchParams(window.location.search);
    const candidateId = params.get("id");

    if (!candidateId) {
        setStatus("Candidate ID is missing.", "error");
        return;
    }

    loadAdminProfile();

    async function loadAdminProfile() {
        setStatus("Loading candidate profile...", "info");

        try {
            const response = await fetch(`/admin/candidates/${candidateId}/detail`, {
                credentials: "include"
            });

            if (response.status === 401) {
                setStatus("Admin access is required.", "error");
                window.setTimeout(() => {
                    window.location.href = "admin-login.html";
                }, 700);
                return;
            }

            const candidate = await response.json();

            if (!response.ok || candidate.error) {
                setStatus(candidate.error || "Candidate not found.", "error");
                return;
            }

            populateProfile(candidate);
            setStatus("Admin candidate profile loaded.", "success");
        } catch (error) {
            console.error("Failed to load admin candidate profile", error);
            setStatus("Unable to load candidate profile.", "error");
        }
    }

    function populateProfile(candidate) {
        const imageEl = document.getElementById("profile-img");
        const nameEl = document.getElementById("name");
        const candidateIdEl = document.getElementById("candidate-id");
        const visionEl = document.getElementById("vision");
        const manifestoEl = document.getElementById("manifesto");
        const pillarsEl = document.getElementById("pillars");
        const votes = Number(candidate.votes) || 0;
        const policyText = normalizeText(candidate.policy, "No policy details provided.");
        const visionText = normalizeText(candidate.vision, "No vision available.");
        const manifestoText = normalizeText(candidate.manifesto, "No manifesto available.");
        const partyText = normalizeText(candidate.party, "Independent");
        const positionText = normalizeText(candidate.position, "Candidate");
        const statusText = Number(candidate.status) === 1 ? "Active" : "Disabled";
        const summaryText = firstSentence(policyText) || "Candidate details are available for committee review.";

        if (imageEl) {
            imageEl.src = candidate.image_url || "https://via.placeholder.com/120";
        }

        if (nameEl) {
            nameEl.innerText = normalizeText(candidate.name, "Unknown Candidate");
        }

        if (candidateIdEl) {
            candidateIdEl.innerText = `CAN-${String(candidate.candidate_id).padStart(3, "0")}`;
        }

        if (partyChip) {
            partyChip.innerText = partyText;
        }

        if (positionChip) {
            positionChip.innerText = positionText;
        }

        if (taglineEl) {
            taglineEl.innerText = `${summaryText.replace(/\.$/, "")} · Admin review snapshot for MFU Election.`;
        }

        if (policySummaryEl) {
            policySummaryEl.innerText = policyText;
        }

        if (votesEl) {
            votesEl.innerText = `${votes} Vote${votes === 1 ? "" : "s"}`;
        }

        if (rankingTextEl) {
            rankingTextEl.innerText = `Running for ${positionText}`;
        }

        if (visionEl) {
            visionEl.innerText = visionText;
        }

        if (manifestoEl) {
            manifestoEl.innerText = manifestoText;
        }

        if (statusChipEl) {
            statusChipEl.innerText = statusText;
        }

        if (statusTextEl) {
            statusTextEl.innerText = statusText;
        }

        if (partyTextEl) {
            partyTextEl.innerText = partyText;
        }

        if (positionTextEl) {
            positionTextEl.innerText = positionText;
        }

        if (pillarsEl) {
            pillarsEl.innerHTML = buildPillars(policyText, visionText, manifestoText);
        }
    }

    function buildPillars(policyText, visionText, manifestoText) {
        const items = [
            {
                title: "Policy Focus",
                text: shortText(policyText)
            },
            {
                title: "Vision Priority",
                text: shortText(visionText)
            },
            {
                title: "Manifesto Theme",
                text: shortText(manifestoText)
            }
        ];

        return items.map((item) => `
            <div class="pillar-card">
                <h4>${item.title}</h4>
                <p>${item.text}</p>
            </div>
        `).join("");
    }

    function normalizeText(value, fallback) {
        if (!value) return fallback;
        const text = String(value).trim();
        if (!text || text.toUpperCase() === "NULL") {
            return fallback;
        }
        return text;
    }

    function firstSentence(text) {
        return text.split(/[.!?]/).map((part) => part.trim()).find(Boolean) || "";
    }

    function shortText(text) {
        return text.length > 90 ? `${text.slice(0, 87).trim()}...` : text;
    }

    function setStatus(message, level) {
        if (!statusMessageEl) return;
        statusMessageEl.textContent = message;
        statusMessageEl.dataset.level = level;
    }
});
