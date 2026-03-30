let sidebarOpen = false;
let cachedCandidates = [];
let historyRecords = [];
let historySearchInputEl = null;
let liveLogRecords = [];
let liveLogSearchInput = null;
let standingsRecords = [];
const dashboardErrorEl = document.getElementById('dashboard-error');

const searchInput = document.getElementById('candidate-search');
const sortSelect = document.getElementById('sort-candidate');
const dashboardLiveSearchInput = document.getElementById('dashboard-live-search');

if (searchInput) {
    searchInput.addEventListener('input', handleCandidateFilters);
}

if (sortSelect) {
    sortSelect.addEventListener('change', handleCandidateFilters);
}

dashboardLiveSearchInput?.addEventListener('input', () => {
    renderStandings(filterStandings());
});

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        closeSidebar();
    }
});

function formatNumber(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return '0';
    }
    return numeric.toLocaleString();
}

function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    sidebar?.classList.toggle('open', sidebarOpen);
    backdrop?.classList.toggle('active', sidebarOpen);
}

function closeSidebar() {
    if (!sidebarOpen) {
        return;
    }

    toggleSidebar();
}

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

async function loadDashboard() {
    const response = await fetch("/dashboard");
    const data = await response.json();

    if (dashboardErrorEl) {
        if (data.error) {
            dashboardErrorEl.textContent = data.error;
            dashboardErrorEl.hidden = false;
        } else {
            dashboardErrorEl.hidden = true;
        }
    }

    if (data.error) {
        return;
    }

    const statsContainer = document.getElementById("stats");
    if (statsContainer) {
        const turnout = Number.isFinite(Number(data.percentage))
            ? Number(data.percentage).toFixed(2)
            : "0.00";

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h4>Total Voters</h4>
                <p>${formatNumber(data.voters)}</p>
                <span>registered university voters</span>
            </div>
            <div class="stat-card">
                <h4>Active Candidates</h4>
                <p>${formatNumber(data.candidates)}</p>
                <span>profiles on the ballot</span>
            </div>
            <div class="stat-card">
                <h4>Votes Cast</h4>
                <p>${formatNumber(data.votes)}</p>
                <span>ballots counted so far</span>
            </div>
            <div class="stat-card">
                <h4>Voting %</h4>
                <p>${turnout}%</p>
                <span>of registered voters</span>
            </div>
        `;
    }

    loadStandings();
}

async function loadStandings() {
    const response = await fetch("/results");
    const standings = await response.json();
    const tbody = document.getElementById("standing-table-body");
    const mobileList = document.getElementById("standings-mobile-list");

    if (!tbody || !mobileList) {
        return;
    }

    if (!Array.isArray(standings)) {
        tbody.innerHTML =
            `<tr><td colspan="5">Unable to load standings</td></tr>`;
        mobileList.innerHTML = `<div class="standings-card">Unable to load standings</div>`;
        return;
    }

    standingsRecords = standings;
    renderStandings(filterStandings());
}

function filterStandings() {
    const term = dashboardLiveSearchInput?.value.trim().toLowerCase() || "";

    if (!term) {
        return standingsRecords;
    }

    return standingsRecords.filter(candidate => {
        const label = [
            candidate.name,
            candidate.party,
            candidate.position,
            candidate.policy,
            candidate.vision,
            candidate.manifesto,
            `CAN-${String(candidate.candidate_id || 0).padStart(3, "0")}`
        ].join(" ").toLowerCase();

        return label.includes(term);
    });
}

function renderStandings(standings) {
    const tbody = document.getElementById("standing-table-body");
    const mobileList = document.getElementById("standings-mobile-list");

    if (!tbody || !mobileList) {
        return;
    }

    if (!Array.isArray(standings) || !standings.length) {
        tbody.innerHTML = `<tr><td colspan="8">No standings found</td></tr>`;
        mobileList.innerHTML = `<div class="standings-card">No standings found</div>`;
        return;
    }

    tbody.innerHTML = standings.map((c, index) => {
        const votes = c.votes || 0;

        return `
        <tr>
            <td>${index + 1}</td>
            <td>
                <strong>${c.name}</strong><br>
                <small>Candidate ID: CAN-${String(c.candidate_id).padStart(3, "0")}</small>
            </td>
            <td>${c.party || "Independent"}</td>
            <td>${c.position || "Candidate"}</td>
            <td>${c.policy || "Policy not available"}</td>
            <td>${c.vision || "Vision not shared yet"}</td>
            <td>${c.manifesto || "Manifesto pending"}</td>
            <td>${votes}</td>
        </tr>
        `;

    }).join("");

    const topVotes = Math.max(...standings.map(candidate => Number(candidate.votes) || 0), 0);

    mobileList.innerHTML = standings.map((candidate, index) => {
        const votes = Number(candidate.votes) || 0;
        const progress = topVotes ? Math.max(6, Math.round((votes / topVotes) * 100)) : 0;

        return `
            <article class="standings-card">
                <h3>${index + 1}. ${candidate.name || "Unknown Candidate"}</h3>
                <div class="meta">
                    <span>${candidate.party || "Independent"}</span>
                    <span>${candidate.position || "Candidate"}</span>
                    <span>CAN-${String(candidate.candidate_id || 0).padStart(3, "0")}</span>
                </div>
                <div class="progress">
                    <span style="width: ${progress}%"></span>
                </div>
                <div class="meta">
                    <span><strong>${votes}</strong> votes</span>
                </div>
            </article>
        `;
    }).join("");
}

async function loadCandidates() {
    const response = await fetch("/candidates");

    if (!response.ok) {
        console.error("Server error");
        return;
    }

    const candidates = await response.json();

    if (!Array.isArray(candidates)) {
        const container = candidateContainer();
        if (container) {
            container.innerHTML = "<p>No candidates available.</p>";
        }
        cachedCandidates = [];
        return;
    }

    cachedCandidates = candidates;
    handleCandidateFilters();
}

function candidateContainer() {
    return document.getElementById("candidates");
}

function handleCandidateFilters() {
    renderCandidateGrid(filterAndSortCandidates());
}

function filterAndSortCandidates() {
    if (!Array.isArray(cachedCandidates)) {
        return [];
    }

    const searchTerm = searchInput?.value.trim().toLowerCase() || "";
    let filtered = cachedCandidates.slice();

    if (searchTerm) {
        filtered = filtered.filter(candidate => {
            const label = [
                candidate.name,
                candidate.party,
                `CAN-${String(candidate.candidate_id).padStart(3, "0")}`
            ].join(" ").toLowerCase();
            return label.includes(searchTerm);
        });
    }

    const sortMode = sortSelect?.value || "votes";

    filtered.sort((a, b) => {
        if (sortMode === "name") {
            return (a.name || "").localeCompare(b.name || "");
        }
        const votesA = a.votes || 0;
        const votesB = b.votes || 0;
        return votesB - votesA;
    });

    return filtered;
}

function renderCandidateGrid(candidates) {
    const container = candidateContainer();
    if (!container) return;

    if (!candidates.length) {
        container.innerHTML = "<p class=\"empty-state\">No candidates matched your search.</p>";
        return;
    }

    container.innerHTML = candidates.map(candidateCardMarkup).join("");
}

function candidateCardMarkup(candidate) {
    const votes = candidate.votes || 0;
    const badge = `CAN-${String(candidate.candidate_id).padStart(3, "0")}`;
    const imageUrl = resolveCandidateImage(candidate);

    return `
        <div class="candidate">
            <img src="${imageUrl}"
                class="candidate-photo"
                alt="${candidate.name || "Candidate photo"}">
            <div class="candidate-badge">${badge}</div>
            <h4>${candidate.name || "Unknown Candidate"}</h4>
            <p class="candidate-party">${candidate.party || "Independent"}</p>
            <p class="candidate-position">${candidate.position || "Candidate"}</p>
            <p class="candidate-policy">
                "${candidate.policy || "Policy details coming soon."}"
            </p>
            <div class="vote-count">
                🗳 ${votes} Votes
            </div>
            <div class="candidate-buttons">
                <button class="profile-btn" onclick="viewProfile(${candidate.candidate_id})">
                    View Profile
                </button>
                <button class="vote-btn" onclick="voteCandidate(${candidate.candidate_id}, this)">
                    Vote
                </button>
            </div>
        </div>
    `;
}

function resolveCandidateImage(candidate) {
    if (typeof getCandidateAvatarUrl === "function") {
        return getCandidateAvatarUrl(candidate);
    }
    return String(candidate?.image_url || "").trim();
}

function viewProfile(candidateId) {
    window.location.href = `candidate-profile.html?id=${candidateId}`;
}

async function voteCandidate(candidateId, button) {
    button.disabled = true;

    const confirmVote =
        confirm("Are you sure you want to vote for this candidate?");

    if (!confirmVote) {
        button.disabled = false;
        return;
    }

    try {
        const response = await fetch("/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ candidate_id: candidateId })
        });

        const result = await response.json();

        if (result.success) {
            storeCandidateIdForReceipt(candidateId);
            storeReturnAnchor('#candidates-section');
            const params = new URLSearchParams();
            params.set('candidate_id', candidateId);
            if (result.vote_id) {
                params.set('vote', result.vote_id);
            }
            window.location.href = `receipt.html?${params.toString()}`;
            return;
        }

        alert(result.message || result.error || "Voting failed");
    } catch (err) {
        console.error("Vote request failed", err);
        alert("Voting failed. Please try again later.");
    } finally {
        button.disabled = false;
    }
}

async function loadHistory() {
    const response = await fetch("/voter/history");

    if (!response.ok) {
        console.error("Unable to fetch history");
        return;
    }

    const payload = await response.json();

    if (!payload || !payload.success) {
        console.error("History response invalid");
        return;
    }

    historyRecords = Array.isArray(payload.history) ? payload.history : [];
    updateHistorySummary(payload.summary || {});
    renderHistoryTable(historySearchInputEl?.value || "");
    loadLiveLog();
}

function updateHistorySummary(summary) {
    document.getElementById("history-total-votes").textContent =
        summary.total_votes ?? 0;
    document.getElementById("history-participation").textContent =
        `${summary.participation_rate ?? 0}%`;
    document.getElementById("history-eligibility").textContent =
        summary.active_eligibility ?? 0;
}

function renderHistoryTable(filterTerm = "") {
    const tbody = document.getElementById("history-table-body");
    if (!tbody) return;
    const term = filterTerm.trim().toLowerCase();
    if (!historyRecords.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="history-empty">
                    You have not voted yet. Cast a vote to see your history here.
                </td>
            </tr>`;
        updateHistoryCount(0, 0);
        return;
    }

    const filtered = historyRecords.filter(record => {
        if (!term) return true;
        const label = [
            `VOTE-${String(record.vote_id).padStart(3, "0")}`,
            record.name,
            record.party,
            record.position
        ].join(" ").toLowerCase();
        return label.includes(term);
    });

    if (!filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="history-empty">
                    No history records match that search.
                </td>
            </tr>`;
        updateHistoryCount(filtered.length, historyRecords.length);
        return;
    }

    tbody.innerHTML = filtered.map(record => {
        const timestamp = formatTimestamp(record.vote_time);
        return `
        <tr>
            <td data-label="ID">#${String(record.vote_id).padStart(3, "0")}</td>
            <td data-label="Election Name">
                <strong>MFU Student Council ${new Date(record.vote_time).getFullYear()}</strong><br>
                <small>${record.position || "Representative"} • ${record.party || "General"}</small>
            </td>
            <td data-label="Candidate" class="history-candidate">
                <img src="${resolveCandidateImage(record)}" alt="${record.name || 'Candidate photo'}">
                <span>${record.name || "Unknown Candidate"}</span>
            </td>
            <td data-label="Timestamp">${timestamp}</td>
            <td data-label="Status"><span class="status-chip">Completed</span></td>
        <td data-label="Actions"><button class="history-action-btn" onclick="viewReceipt(${record.vote_id}, ${record.candidate_id || 0})">View</button></td>
        </tr>
        `;
    }).join("");

    updateHistoryCount(filtered.length, historyRecords.length);
}

function updateHistoryCount(filtered, total) {
    const label = document.getElementById("history-count");
    if (label) {
        label.textContent = filtered === total
            ? `Showing ${total} entries`
            : `Showing ${filtered} of ${total} entries`;
    }
}

async function loadLiveLog(limit = 6) {
    const response = await fetch(`/votes/recent?limit=${limit}`);
    if (!response.ok) {
        renderLiveLog([]);
        return;
    }

    const payload = await response.json();
    if (!payload || !payload.success) {
        renderLiveLog([]);
        return;
    }

    const overallVotes = payload.overall_votes || 0;
    const rawLog = (Array.isArray(payload.liveLog) ? payload.liveLog : []).map(entry => {
        const share = overallVotes
            ? Math.min(100, Math.round((entry.candidate_votes / overallVotes) * 100))
            : 0;
        return { ...entry, sharePercent: share };
    }).sort((a, b) => (b.sharePercent ?? 0) - (a.sharePercent ?? 0));
    const unique = {};
    rawLog.forEach(entry => {
        const key = entry.candidate_id ?? entry.name;
        if (!unique[key] || new Date(entry.vote_time) > new Date(unique[key].vote_time || 0)) {
            unique[key] = entry;
        }
    });
    liveLogRecords = Object.values(unique).sort((a,b)=> (b.sharePercent ?? 0)-(a.sharePercent ?? 0));
    renderLiveLog(filterLiveLogRecords(liveLogSearchInput?.value || ""));
}

function filterLiveLogRecords(term = "") {
    const normalized = (term || "").trim().toLowerCase();
    if (!normalized) return liveLogRecords;
    return liveLogRecords.filter(entry => {
        const label = [
            entry.name,
            entry.party,
            `CAN-${String(entry.candidate_id || 0).padStart(3, "0")}`
        ].join(" ").toLowerCase();
        return label.includes(normalized);
    });
}

function getCandidateById(id) {
    if (!id || !Array.isArray(cachedCandidates)) return null;
    return cachedCandidates.find(candidate => String(candidate.candidate_id) === String(id));
}

function renderLiveLog(entries) {
    const list = document.getElementById("live-log-list");
    const mobileList = document.getElementById("live-log-mobile-list");
    if (!list || !mobileList) return;
    if (!entries.length) {
        list.innerHTML = `<tr class="live-log-entry loading"><td colspan="4">Waiting for more ballots to arrive.</td></tr>`;
        mobileList.innerHTML = `<div class="live-log-mobile-empty">Waiting for more ballots to arrive.</div>`;
        return;
    }

    const limited = entries.slice(0, 5);

    list.innerHTML = limited.map(entry => {
        const timeLabel = formatTimestamp(entry.vote_time);
        const candidate = getCandidateById(entry.candidate_id);
        const candidateLabel = `${candidate?.name || entry.name || "Unknown Candidate"} · ${candidate?.party || entry.party || "Independent"}`;
        const share = entry.sharePercent ?? 0;
        const shareLabel = entry.sharePercent ? `${entry.sharePercent}%` : "0%";
        const colorClass = shareToColor(entry.sharePercent || 0);
        const candidateIdLabel = `CAN-${String(entry.candidate_id || 0).padStart(3, '0')}`;
        const avatarUrl = resolveCandidateImage({ ...entry, image_url: candidate?.image_url });
        const positionLabel = entry.position || candidate?.position || "Candidate";
        return `
            <tr class="live-log-entry">
                <td class="live-log-candidate">
                    <img src="${avatarUrl}" alt="${candidateLabel}">
                    <div>
                        <strong>${candidateLabel}</strong>
                        <span>${positionLabel} · ${candidateIdLabel}</span>
                    </div>
                </td>
                <td class="live-log-percent">
                    <div class="live-log-progress">
                        <span class="live-log-progress-fill ${colorClass}" style="width:${share}%"></span>
                    </div>
                    <div class="live-log-meta">
                        <span class="live-share ${colorClass}">${shareLabel}</span>
                    </div>
                </td>
                <td class="live-log-count">
                    <span>${entry.candidate_votes ?? 0}</span>
                </td>
                <td class="live-log-action">
                    <button class="profile-link" onclick="viewProfile(${entry.candidate_id || 0})">View Profile</button>
                    <small>${timeLabel}</small>
                </td>
            </tr>
        `;
    }).join("");

    mobileList.innerHTML = limited.map(entry => {
        const timeLabel = formatTimestamp(entry.vote_time);
        const candidate = getCandidateById(entry.candidate_id);
        const candidateLabel = candidate?.name || entry.name || "Unknown Candidate";
        const partyLabel = candidate?.party || entry.party || "Independent";
        const share = entry.sharePercent ?? 0;
        const shareLabel = entry.sharePercent ? `${entry.sharePercent}%` : "0%";
        const colorClass = shareToColor(entry.sharePercent || 0);
        const candidateIdLabel = `CAN-${String(entry.candidate_id || 0).padStart(3, "0")}`;
        const avatarUrl = resolveCandidateImage({ ...entry, image_url: candidate?.image_url });
        const positionLabel = entry.position || candidate?.position || "Candidate";

        return `
            <article class="live-log-mobile-card">
                <div class="live-log-mobile-top">
                    <img src="${avatarUrl}" alt="${candidateLabel}">
                    <div class="live-log-mobile-summary">
                        <h3>${candidateLabel}</h3>
                        <p>${partyLabel}</p>
                        <span>${positionLabel} · ${candidateIdLabel}</span>
                    </div>
                    <span class="live-share ${colorClass}">${shareLabel}</span>
                </div>
                <div class="live-log-mobile-stats">
                    <div class="live-log-progress">
                        <span class="live-log-progress-fill ${colorClass}" style="width:${share}%"></span>
                    </div>
                    <div class="live-log-mobile-meta">
                        <strong>${entry.candidate_votes ?? 0} votes</strong>
                        <small>${timeLabel}</small>
                    </div>
                </div>
                <button class="profile-link live-log-mobile-btn" onclick="viewProfile(${entry.candidate_id || 0})">View Profile</button>
            </article>
        `;
    }).join("");
}

function shareToColor(percent) {
    if (percent >= 40) return 'share-high';
    if (percent >= 20) return 'share-mid';
    if (percent >= 5) return 'share-low';
    return 'share-minor';
}

function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Unknown time";
    }
    return date.toLocaleString();
}

function exportHistory() {
    if (!historyRecords.length) {
        alert("No history data to export.");
        return;
    }

    const header = ["Vote ID", "Candidate", "Position", "Party", "Timestamp"];
    const rows = historyRecords.map(record => [
        `VOTE-${String(record.vote_id).padStart(3, "0")}`,
        record.name,
        record.position,
        record.party,
        formatTimestamp(record.vote_time)
    ]);

    const csvContent = [header, ...rows]
        .map(row => row.map(cell => `"${(cell ?? "").toString().replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mfu-voting-history-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportLiveLog() {
    if (!liveLogRecords.length) {
        alert("No live data to export yet.");
        return;
    }

    const header = ["Candidate", "Party", "Position", "Share (%)", "Votes", "Timestamp"];
    const rows = liveLogRecords.map(entry => [
        entry.name,
        entry.party || "Independent",
        entry.position || "Candidate",
        entry.sharePercent ?? 0,
        entry.candidate_votes ?? 0,
        formatTimestamp(entry.vote_time)
    ]);

    const csvContent = [header, ...rows]
        .map(row => row.map(cell => `"${(cell ?? "").toString().replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mfu-live-voting-log-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function viewReceipt(voteId, candidateId) {
    if (candidateId) {
        storeCandidateIdForReceipt(candidateId);
    }
    storeReturnAnchor('#history-section');
    const params = new URLSearchParams();
    if (voteId) {
        params.set('vote', voteId);
    }
    if (candidateId) {
        params.set('candidate_id', candidateId);
    }
    window.location.href = `receipt.html?${params.toString()}`;
}

function storeCandidateIdForReceipt(candidateId) {
    if (!candidateId) return;
    try {
        localStorage.setItem('voted_candidate', candidateId);
    } catch (err) {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem('voted_candidate', candidateId);
        }
    }
}

function storeReturnAnchor(anchor) {
    try {
        localStorage.setItem('return_anchor', anchor);
    } catch (err) {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem('return_anchor', anchor);
        }
    }
}

async function logout() {
    await fetch("/logout", { method: "POST" });
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadCandidates();
    dashboardLiveSearchInput?.addEventListener('input', () => {
        renderStandings(filterStandings());
    });
    historySearchInputEl = document.getElementById('history-search');
    liveLogSearchInput = document.getElementById('live-log-search');
    liveLogSearchInput?.addEventListener('input', () => {
        renderLiveLog(filterLiveLogRecords(liveLogSearchInput.value));
    });
    if (historySearchInputEl) {
        historySearchInputEl.addEventListener('input', () => {
            renderHistoryTable(historySearchInputEl.value);
        });
    }
});
