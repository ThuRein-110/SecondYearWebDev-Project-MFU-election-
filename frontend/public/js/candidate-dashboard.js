function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionName + '-section').classList.add('active');

    // Add active class to clicked nav item
    event.target.closest('.nav-item').classList.add('active');

    // Load data for the section
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'results') {
        loadResults();
    }
}

let candidateProfile = {};
let lastHourlyData = [];

async function loadCandidateProfile() {
    const response = await fetch('/candidate/profile');
    if (!response.ok) return;
    const profile = await response.json();
    candidateProfile = profile;
    updateProfileUI(profile);
}

function updateProfileUI(profile) {
    const greeting = document.querySelector('.user-info span');
    if (greeting) {
        greeting.textContent = `Welcome, ${profile.name || 'Candidate'}`;
    }

    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.value = profile.name || '';
    }

    const policyInput = document.getElementById('policy');
    if (policyInput) {
        policyInput.value = profile.policy || '';
    }

    const visionInput = document.getElementById('vision');
    if (visionInput) {
        visionInput.value = profile.vision || '';
    }

    const manifestoInput = document.getElementById('manifesto');
    if (manifestoInput) {
        manifestoInput.value = profile.manifesto || '';
    }

    const candidateIdInput = document.getElementById('candidate-id');
    if (candidateIdInput) {
        candidateIdInput.value = profile.candidate_id
            ? `MFU-${String(profile.candidate_id).padStart(3, '0')}`
            : '';
    }

    const summaryName = document.getElementById('profile-name');
    if (summaryName) {
        summaryName.textContent = profile.name || 'Candidate';
    }

    const summaryRole = document.getElementById('profile-role');
    if (summaryRole) {
        summaryRole.textContent = profile.position || profile.party || 'Candidate';
    }

    const summaryPolicy = document.getElementById('profile-policy');
    if (summaryPolicy) {
        summaryPolicy.textContent = profile.vision || 'Share a bold vision for the campus.';
    }

    const summaryManifesto = document.getElementById('profile-manifesto');
    if (summaryManifesto) {
        summaryManifesto.textContent = profile.manifesto || 'Highlight your manifesto commitments here.';
    }

    const summaryVotes = document.getElementById('profile-votes');
    if (summaryVotes) {
        summaryVotes.textContent = profile.votes ?? 0;
    }

    const avatar = document.getElementById('candidate-avatar');
    if (avatar && profile.image_url) {
        avatar.src = profile.image_url;
    }

    populateDashboardSummary(profile);
}

function populateDashboardSummary(profile) {
    updateDashboardSummary({
        name: profile.name,
        candidateId: profile.candidate_id,
        vision: profile.vision,
        policy: profile.policy,
        votes: profile.votes ?? 0,
        image_url: profile.image_url
    });
}

function discardChanges() {
    updateProfileUI(candidateProfile);
}

async function loadDashboard() {
    const response = await fetch('/candidate/dashboard');
    if (!response.ok) {
        alert('Unable to load dashboard data.');
        return;
    }
    const data = await response.json();
    renderStatsCards(data);
    renderChart(data.hourlyPerformance);
    updateDashboardSummary(data);
    renderLeaderboard(data.leaderboard, data.rank);
    renderActivity(data.recentActivity);
    updateGoalMeter(data.votes, data.goalTarget ?? 60);
    renderLeaderboardBars(data.leaderboard, data.totalVotes);
}

function renderStatsCards(data) {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;
    grid.innerHTML = `
        <div class="stat-card">
            <div class="label">Total Votes</div>
            <strong>${data.totalVotes.toLocaleString()}</strong>
            <span class="dash-note">+18.4% since last 2 hours</span>
        </div>
        <div class="stat-card">
            <div class="label">Current Rank</div>
            <strong>#${data.rank}</strong>
            <span class="dash-note">${data.leaderboard.length} tracked candidates</span>
        </div>
        <div class="stat-card">
            <div class="label">Voter Turnout</div>
            <strong>${data.turnoutPercent}%</strong>
            <span class="dash-note">+5.2% total university turnout</span>
        </div>
    `;
}

function updateDashboardSummary(data) {
    const nameEl = document.getElementById('dashboard-name');
    if (nameEl) nameEl.textContent = data.name || 'Candidate';

    const idEl = document.getElementById('dashboard-id');
    if (idEl) idEl.textContent = `Candidate ID • MFU-${String(data.candidateId).padStart(3, '0')}`;

    const visionEl = document.getElementById('dashboard-vision');
    if (visionEl) visionEl.textContent = data.vision || 'Share your vision statement with voters.';

    const policyEl = document.getElementById('dashboard-policy');
    if (policyEl) policyEl.textContent = data.policy || 'Platform coming soon.';

    const votesEl = document.getElementById('dashboard-votes');
    if (votesEl) votesEl.textContent = data.votes.toLocaleString();

    const avatar = document.getElementById('dashboard-avatar');
    if (avatar && data.image_url) avatar.src = data.image_url;
}

function renderLeaderboard(list, currentRank) {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;
    body.innerHTML = list.map(row => `
        <tr class="${row.rank === currentRank ? 'highlight' : ''}">
            <td>${row.rank}</td>
            <td>${row.name}</td>
            <td>${row.votes.toLocaleString()}</td>
            <td>${row.trend}</td>
        </tr>
    `).join('');
}

function renderActivity(events) {
    const list = document.getElementById('activity-list');
    if (!list) return;
    list.innerHTML = events.map(item => `<li>${item}</li>`).join('');
}

function updateGoalMeter(votes, goalTarget = 60) {
    const goal = goalTarget;
    const percent = Math.min(100, Math.round((votes / goal) * 100));
    const bar = document.getElementById('goal-progress');
    if (bar) bar.style.width = `${percent}%`;
    const text = document.getElementById('goal-text');
    if (text) text.textContent = votes >= goal
        ? 'You have reached your goal!'
        : `You are ${goal - votes} votes away from your milestone.`;
}

function renderChart(points) {
    const canvas = document.getElementById('votes-chart');
    if (!canvas || !points || points.length === 0) return;
    lastHourlyData = points;

    const parentWidth = canvas.parentElement.clientWidth;
    if (parentWidth === 0) return;
    const height = 260;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = parentWidth * ratio;
    canvas.height = height * ratio;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, parentWidth, height);

    const max = Math.max(...points.map(p => p.votes)) || 1;
    const stepX = points.length > 1 ? parentWidth / (points.length - 1) : parentWidth;

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2563EB';
    points.forEach((point, index) => {
        const x = index * stepX;
        const y = height - (point.votes / max) * (height - 20) - 10;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // gradient fill
    ctx.lineTo(parentWidth, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    points.forEach((point, index) => {
        const x = index * stepX;
        ctx.fillText(point.label, x, height - 6);
    });

    const ySteps = 4;
    ctx.textAlign = 'right';
    ctx.font = '11px Inter';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= ySteps; i++) {
        const y = height - (i / ySteps) * (height - 20) - 10;
        const value = Math.round((max * i) / ySteps);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(parentWidth, y);
        ctx.stroke();
        ctx.fillText(value.toLocaleString(), parentWidth - 4, y + 3);
    }

    ctx.fillStyle = '#1F2937';
    ctx.textAlign = 'left';
    ctx.beginPath();
    ctx.moveTo(0, height - 10);
    ctx.lineTo(parentWidth, height - 10);
    ctx.stroke();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

window.addEventListener('resize', () => {
    if (lastHourlyData.length) {
        renderChart(lastHourlyData);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-stats');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadDashboard());
    }
});

async function updateInfo() {
    const name = document.getElementById('name').value;
    const policy = document.getElementById('policy').value;
    const vision = document.getElementById('vision').value;
    const manifesto = document.getElementById('manifesto').value;
    const response = await fetch('/candidate/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, policy, vision, manifesto })
    });
    const result = await response.json();
    alert(result.success ? 'Information updated successfully' : 'Update failed');
    if (result.success) {
        loadCandidateProfile();
    }
}

function renderLeaderboardBars(list, totalVotes = 0) {
    const container = document.getElementById('leaderboard-bars');
    if (!container) return;
    const entries = Array.isArray(list) ? list : [];
    if (!entries.length) {
        container.innerHTML = `<p class="bar-empty">Leaderboard data is not available yet.</p>`;
        return;
    }

    const maxVotes = Math.max(...entries.map(row => row.votes || 0));
    const total = totalVotes || Math.max(maxVotes, 1);

    container.innerHTML = entries.map(row => {
        const votes = row.votes || 0;
        const widthPct = maxVotes ? Math.round((votes / maxVotes) * 100) : 0;
        const share = total ? Math.round((votes / total) * 100) : 0;
        return `
            <div class="leaderboard-bar">
                <div class="leaderboard-bar-info">
                    <span>${row.rank}. ${row.name}</span>
                    <span>${votes.toLocaleString()} votes</span>
                </div>
                <div class="leaderboard-bar-track">
                    <span class="leaderboard-bar-fill" style="width:${widthPct}%"></span>
                </div>
                <div class="leaderboard-bar-meta">
                    <span>${share}% of total votes</span>
                </div>
            </div>
        `;
    }).join('');
}

async function loadResults() {
    const response = await fetch('/results');
    const results = await response.json();
    document.getElementById('results-list').innerHTML = results.map((r, index) => `
        <div class="result">
            <div class="rank">#${index + 1}</div>
            <h3>${r.name}</h3>
            <p>${r.policy}</p>
            <div class="votes">Votes: ${r.votes}</div>
        </div>
    `).join('');
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = 'login.html';
}

// Initialize dashboard on load
loadCandidateProfile();
loadDashboard();
