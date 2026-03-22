const navItems = document.querySelectorAll('.nav-item');
const overviewCards = document.getElementById('overview-cards');
const votersTable = document.getElementById('voters-table');
const candidatesTable = document.getElementById('candidates-table');
const leadList = document.getElementById('lead-list');
const eventList = document.getElementById('event-list');
const chartCanvas = document.getElementById('turnout-chart');
const closeButton = document.querySelector('.primary');

const defaultEvents = [
    { text: 'Election status updated to LIVE by Admin Committee', time: '2 minutes ago' },
    { text: 'Automated integrity check: No discrepancies found', time: '15 minutes ago' },
    { text: 'New batch of 500 voter IDs imported via bulk upload', time: '42 minutes ago' },
    { text: "Candidate ID 'C-005' updated personal policy statement", time: '1 hour ago' }
];

navItems.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        setActiveNav(link);
        scrollToSection(link.dataset.target);
    });
});

function setActiveNav(activeLink) {
    navItems.forEach(item => item.classList.remove('active'));
    activeLink.classList.add('active');
}

function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function loadDashboard() {
    const response = await fetch('/dashboard', { credentials: 'include' });
    const data = await response.json();

    if (data.error) {
        alert(data.error);
        window.location.href = 'login.html';
        return;
    }

    renderOverviewCards(data);
    drawTurnoutChart(data.voters, data.votes);
    loadLeadStandings();
}

function renderOverviewCards(data) {
    const cards = [
        { label: 'Total Registered Voters', value: data.voters ?? 0, meta: '98.5% of eligible population' },
        { label: 'Votes Cast', value: data.votes ?? 0, meta: `${data.percentage ?? 0}% current turnout` },
        { label: 'Active Candidates', value: data.candidates ?? 0, meta: 'Verified and public' },
        { label: 'System Health', value: data.voting_enabled ? 'Optimal' : 'Paused', meta: 'No anomalies detected' }
    ];
    overviewCards.innerHTML = cards.map(card => `
        <div class="card">
            <h4>${card.label}</h4>
            <strong>${card.value}</strong>
            <span>${card.meta}</span>
        </div>
    `).join('');
}

function drawTurnoutChart(voters = 0, votes = 0) {
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    const points = [0, votes * 0.25, votes * 0.5, votes * 0.7, votes];
    const max = Math.max(voters, votes, 1);
    const stepX = chartCanvas.width / (points.length - 1);

    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    ctx.fillStyle = '#e0e7ff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((value, index) => {
        const x = index * stepX;
        const y = chartCanvas.height - (value / max) * chartCanvas.height;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.lineTo(chartCanvas.width, chartCanvas.height);
    ctx.lineTo(0, chartCanvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    points.forEach((value, index) => {
        const x = index * stepX;
        const y = chartCanvas.height - (value / max) * chartCanvas.height;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

async function loadLeadStandings() {
    const response = await fetch('/results', { credentials: 'include' });
    const results = await response.json();
    if (!Array.isArray(results)) return;
    const maxVotes = Math.max(...results.map(r => r.votes || 0), 1);
    leadList.innerHTML = results.slice(0, 5).map(result => `
        <div class="lead-item">
            <div>
                <strong>${result.name}</strong>
                <span>${result.party || 'Independent'}</span>
            </div>
            <div>
                <span>${result.votes || 0} votes</span>
                <div class="lead-bar" style="width:${Math.min(((result.votes || 0) / maxVotes) * 150, 150)}px;height:4px;background:#2563eb;margin-top:4px;border-radius:999px;"></div>
            </div>
        </div>
    `).join('');
}

function renderEvents() {
    eventList.innerHTML = defaultEvents.map(event => `
        <li>
            ${event.text}
            <span>${event.time}</span>
        </li>
    `).join('');
}

async function loadVoters() {
    const response = await fetch('/admin/voters', { credentials: 'include' });
    const voters = await response.json();
    if (voters.error) {
        alert(voters.error);
        window.location.href = 'login.html';
        return;
    }
    votersTable.innerHTML = voters.map(v => `
        <tr>
            <td>${v.voter_id}</td>
            <td>${v.citizen_id}</td>
            <td>${v.laser_id}</td>
            <td>${v.status ? 'Enabled' : 'Disabled'}</td>
            <td>${v.has_voted ? 'Yes' : 'No'}</td>
            <td class="table-actions">
                <button class="btn ${v.status ? 'btn-danger' : 'btn-success'}" onclick="toggleVoter(${v.voter_id}, ${!v.status})">
                    ${v.status ? 'Disable' : 'Enable'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadCandidates() {
    const response = await fetch('/admin/candidates', { credentials: 'include' });
    const candidates = await response.json();
    if (candidates.error) {
        alert(candidates.error);
        return;
    }
    candidatesTable.innerHTML = candidates.map(c => `
        <tr>
            <td>${c.candidate_id}</td>
            <td>${c.name}</td>
            <td>${c.policy || 'No policy yet'}</td>
            <td>${c.status ? 'Enabled' : 'Disabled'}</td>
            <td class="table-actions">
                <button class="btn ${c.status ? 'btn-danger' : 'btn-success'}" onclick="toggleCandidate(${c.candidate_id}, ${!c.status})">
                    ${c.status ? 'Disable' : 'Enable'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function exportResults() {
    const response = await fetch('/candidates', { credentials: 'include' });
    const data = await response.json();
    if (!Array.isArray(data)) {
        alert('Unable to export results now.');
        return;
    }
    const csv = ['Candidate ID,Name,Party,Votes'];
    data.forEach(item => {
        csv.push([item.candidate_id, item.name, item.party, item.votes || 0].map(value => `"${(value ?? '').toString().replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mfu-results-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

async function toggleVoting() {
    if (!closeButton) return;
    const isOpen = closeButton.textContent.includes('Close');
    const response = await fetch('/admin/toggle-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: isOpen ? 0 : 1 })
    });
    const result = await response.json();
    if (result.success) {
        closeButton.textContent = isOpen ? 'Re-open Election' : 'Close Election';
    }
}

async function toggleVoter(id, status) {
    await fetch('/admin/toggle-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: id, status })
    });
    loadVoters();
}

async function toggleCandidate(id, status) {
    await fetch('/admin/toggle-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: id, status })
    });
    loadCandidates();
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadVoters();
    loadCandidates();
    renderEvents();
    if (closeButton) {
        closeButton.addEventListener('click', () => toggleVoting());
    }
});
