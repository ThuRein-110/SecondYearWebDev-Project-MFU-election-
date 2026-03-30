const navItems = document.querySelectorAll('.nav-item');
const overviewCards = document.getElementById('overview-cards');
const votersTable = document.getElementById('voters-table');
const candidatesTable = document.getElementById('candidates-table');
const votersSearchInput = document.getElementById('voters-search-input');
const candidatesSearchInput = document.getElementById('candidates-search-input');
const leadList = document.getElementById('lead-list');
const leadSearchInput = document.getElementById('lead-search-input');
const registerVoterForm = document.getElementById('register-voter-form');
const registerCandidateForm = document.getElementById('register-candidate-form');
const chartCanvas = document.getElementById('turnout-chart');
const chartLegend = document.getElementById('chart-legend');
const chartTooltip = document.getElementById('chart-tooltip');
const closeButton = document.querySelector('.primary');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('admin-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const adminSections = document.querySelectorAll('.admin-section');
const manageSection = document.getElementById('manage');
const votersListCard = document.getElementById('voters-list');
const candidatesListCard = document.getElementById('candidates-list');

const chartPalette = ['#a855f7', '#ec4899', '#e11d48', '#8b5cf6', '#22c55e', '#4ade80', '#14b8a6', '#3b82f6'];
let chartState = null;
let lastVotePerformance = { labels: [], series: [] };
let standingsResults = [];
let voterResults = [];
let candidateResults = [];
let currentSection = 'overview';

navItems.forEach(link => {
    link.addEventListener('click', event => {
        event.preventDefault();
        showSection(link.dataset.target);
        closeSidebarDrawer();
    });
});

function setActiveNav(activeLink) {
    navItems.forEach(item => item.classList.remove('active'));
    activeLink.classList.add('active');
}

function resolveSectionId(targetId) {
    if (targetId === 'voters-list' || targetId === 'candidates-list') {
        return 'manage';
    }

    return targetId;
}

function updateManageView(targetId) {
    if (!manageSection || !votersListCard || !candidatesListCard) {
        return;
    }

    const isSinglePanel = targetId === 'voters-list' || targetId === 'candidates-list';
    manageSection.classList.toggle('manage--single', isSinglePanel);

    votersListCard.classList.toggle('is-visible', targetId === 'voters-list');
    candidatesListCard.classList.toggle('is-visible', targetId === 'candidates-list');
}

function syncSectionHash(targetId) {
    if (!window.history?.replaceState) {
        return;
    }

    const nextHash = targetId ? `#${targetId}` : '#overview';
    window.history.replaceState(null, '', nextHash);
}

function showSection(targetId = 'overview') {
    const sectionId = resolveSectionId(targetId);
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
        return;
    }

    currentSection = targetId;

    adminSections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });

    updateManageView(targetId);

    const activeNav = Array.from(navItems).find(item => item.dataset.target === targetId)
        || Array.from(navItems).find(item => item.dataset.target === sectionId);

    if (activeNav) {
        setActiveNav(activeNav);
    }

    syncSectionHash(targetId);
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (sectionId === 'overview' && ((lastVotePerformance.labels || []).length || (lastVotePerformance.series || []).length)) {
        drawVotePerformanceChart(lastVotePerformance);
    }
}

function isMobileViewport() {
    return window.innerWidth <= 768;
}

function isDrawerViewport() {
    return window.innerWidth <= 1024;
}

function openSidebarDrawer() {
    if (!isDrawerViewport() || !sidebar) return;
    sidebar.classList.add('is-open');
    document.body.classList.add('drawer-open');

    if (sidebarOverlay) {
        sidebarOverlay.classList.add('is-visible');
        sidebarOverlay.setAttribute('aria-hidden', 'false');
    }

    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'true');
    }
}

function closeSidebarDrawer() {
    if (!sidebar) return;
    sidebar.classList.remove('is-open');
    document.body.classList.remove('drawer-open');

    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('is-visible');
        sidebarOverlay.setAttribute('aria-hidden', 'true');
    }

    if (menuToggle) {
        menuToggle.setAttribute('aria-expanded', 'false');
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
    await loadVotePerformance();
    loadLeadStandings();
}

function renderOverviewCards(data) {
    const cards = [
        { label: 'Total Registered Voters', value: data.voters ?? 0, meta: '98.5% of eligible population' },
        { label: 'Votes Cast', value: data.votes ?? 0, meta: `${data.percentage ?? 0}% current turnout` },
        { label: 'Active Candidates', value: data.candidates ?? 0, meta: 'Verified and public' }
    ];

    overviewCards.innerHTML = cards.map(card => `
        <div class="card">
            <h4>${card.label}</h4>
            <strong>${card.value}</strong>
            <span>${card.meta}</span>
        </div>
    `).join('');
}

async function loadVotePerformance() {
    const response = await fetch('/admin/vote-performance', { credentials: 'include' });
    const payload = await response.json();

    if (!response.ok || payload.error) {
        drawVotePerformanceChart({ labels: [], series: [] });
        return;
    }

    drawVotePerformanceChart(normalizeVotePerformanceData(payload));
}

function normalizeVotePerformanceData(payload) {
    const rawLabels = Array.isArray(payload.labels) ? payload.labels : [];
    const rawSeries = Array.isArray(payload.series) ? payload.series : [];

    const bucketLabels = buildDynamicBucketLabels(rawLabels);

    const normalizedSeries = rawSeries.map(item => {
        const values = bucketLabels.map(bucketIso => {
            const bucketTime = new Date(bucketIso).getTime();
            let latestValue = 0;

            rawLabels.forEach((label, index) => {
                const pointTime = new Date(label).getTime();
                if (!Number.isNaN(pointTime) && pointTime <= bucketTime) {
                    latestValue = Number(item.values?.[index] || 0);
                }
            });

            return latestValue;
        });

        return {
            ...item,
            values
        };
    });

    return {
        labels: bucketLabels,
        series: normalizedSeries
    };
}

function getReferenceDate(labels) {
    const valid = labels
        .map(label => new Date(label))
        .filter(date => !Number.isNaN(date.getTime()));

    if (valid.length) {
        return new Date(valid[valid.length - 1]);
    }

    return new Date();
}

function buildDynamicBucketLabels(labels) {
    const validDates = labels
        .map(label => new Date(label))
        .filter(date => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

    if (!validDates.length) {
        const fallback = [];
        const now = new Date();
        now.setMinutes(0, 0, 0);
        for (let index = 0; index < 7; index += 1) {
            const point = new Date(now);
            point.setHours(now.getHours() - (6 - index));
            fallback.push(point.toISOString());
        }
        return fallback;
    }

    const firstVote = new Date(validDates[0]);
    firstVote.setMinutes(0, 0, 0);
    firstVote.setHours(firstVote.getHours() - 2);

    const lastVote = new Date(validDates[validDates.length - 1]);
    lastVote.setMinutes(0, 0, 0);

    const buckets = [];
    const cursor = new Date(firstVote);

    while (cursor.getTime() <= lastVote.getTime()) {
        buckets.push(new Date(cursor).toISOString());
        cursor.setHours(cursor.getHours() + 1);
    }

    if (buckets.length < 7) {
        const targetLength = 7;
        while (buckets.length < targetLength) {
            const next = new Date(buckets[buckets.length - 1]);
            next.setHours(next.getHours() + 1);
            buckets.push(next.toISOString());
        }
    }

    return buckets;
}

function drawVotePerformanceChart(payload) {
    if (!chartCanvas) return;

    const labels = Array.isArray(payload.labels) ? payload.labels : [];
    const rawSeries = Array.isArray(payload.series) ? payload.series : [];
    const series = rawSeries.map((item, index) => ({
        ...item,
        color: chartPalette[index % chartPalette.length]
    }));
    lastVotePerformance = { labels, series };
    renderChartLegend(series);

    const parentWidth = chartCanvas.parentElement?.clientWidth || 0;
    if (parentWidth === 0) return;
    const height = 300;
    const padding = { top: 10, right: 18, bottom: 54, left: 62 };
    const plotWidth = Math.max(parentWidth - padding.left - padding.right, 1);
    const plotHeight = Math.max(height - padding.top - padding.bottom, 1);
    const ratio = window.devicePixelRatio || 1;
    chartCanvas.width = parentWidth * ratio;
    chartCanvas.height = height * ratio;
    chartCanvas.style.width = '100%';
    chartCanvas.style.height = `${height}px`;

    const ctx = chartCanvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, parentWidth, height);

    const maxVotes = series.length ? Math.max(...series.flatMap(item => item.values || [0]), 0) : 0;
    const yStep = 3;
    const yMax = calculateYAxisMax(maxVotes, yStep);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8ea0bb';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let value = 0; value <= yMax; value += yStep) {
        const y = padding.top + plotHeight - (value / yMax) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(parentWidth - padding.right, y);
        ctx.stroke();
        ctx.fillText(String(value), padding.left - 14, y + 4);
    }

    const xStep = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;
    const labelSkip = labels.length > 7 ? Math.ceil(labels.length / 7) : 1;
    const seriesCoordinates = series.map(item => ({
        ...item,
        points: labels.map((label, index) => {
            const x = padding.left + (labels.length > 1 ? index * xStep : plotWidth / 2);
            const displayVotes = Math.max(0, Math.min(yMax, Number(item.values?.[index] || 0)));
            const y = padding.top + plotHeight - (displayVotes / yMax) * plotHeight;
            return {
                label,
                votes: Number(item.values?.[index] || 0),
                x,
                y,
                displayVotes
            };
        })
    }));

    ctx.fillStyle = '#8ea0bb';
    ctx.textAlign = 'center';
    ctx.font = '11px Inter, sans-serif';
    labels.forEach((label, index) => {
        const x = padding.left + (labels.length > 1 ? index * xStep : plotWidth / 2);
        if (index % labelSkip !== 0 && index !== labels.length - 1) return;
        ctx.fillText(formatTimestampLabel(label), x, height - 14);
    });

    seriesCoordinates.forEach(item => {
        ctx.lineWidth = 3;
        ctx.strokeStyle = item.color;
        ctx.beginPath();
        item.points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        if (item.points.length) ctx.stroke();

        item.points.forEach(point => {
            ctx.beginPath();
            ctx.fillStyle = item.color;
            ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = '#FFFFFF';
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(parentWidth - padding.right, padding.top + plotHeight);
    ctx.stroke();

    chartState = {
        canvas: chartCanvas,
        tooltip: chartTooltip,
        seriesCoordinates,
        padding,
        width: parentWidth,
        height
    };

    if (chartTooltip) {
        chartTooltip.classList.remove('visible');
        chartTooltip.setAttribute('aria-hidden', 'true');
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function renderChartLegend(series) {
    if (!chartLegend) return;

    chartLegend.innerHTML = series.map(item => `
        <div class="legend-item">
            <span class="legend-line" style="background:${item.color}"></span>
            <span class="legend-label">${item.name}</span>
        </div>
    `).join('');
}

function calculateYAxisMax(maxVotes, step) {
    return Math.max(24, Math.ceil((maxVotes + (step * 2)) / step) * step);
}

function formatTimestampLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function drawChartHover(activePoint) {
    if (!chartState || !activePoint) return;
    drawVotePerformanceChart(lastVotePerformance);

    const { canvas, tooltip, padding, height } = chartState;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1;
    ctx.moveTo(activePoint.x, padding.top);
    ctx.lineTo(activePoint.x, padding.top + (height - padding.top - padding.bottom));
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = activePoint.color;
    ctx.arc(activePoint.x, activePoint.y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#FFFFFF';
    ctx.arc(activePoint.x, activePoint.y, 3, 0, Math.PI * 2);
    ctx.fill();

    if (!tooltip) return;
    tooltip.innerHTML = `
        <span class="label">${formatTimestampLabel(activePoint.label)}</span>
        <strong>${activePoint.name}</strong>
        <span>${activePoint.votes.toLocaleString()} votes</span>
    `;
    tooltip.classList.add('visible');
    tooltip.setAttribute('aria-hidden', 'false');
    const clampedX = Math.min(Math.max(activePoint.x, 90), chartState.width - 90);
    tooltip.style.left = `${clampedX}px`;
    tooltip.style.top = `${activePoint.y}px`;
}

function getClosestChartPoint(hoverX, hoverY) {
    if (!chartState?.seriesCoordinates) return null;

    let activePoint = null;
    let bestScore = Number.POSITIVE_INFINITY;

    chartState.seriesCoordinates.forEach(seriesItem => {
        seriesItem.points.forEach(point => {
            const dx = point.x - hoverX;
            const dy = point.y - hoverY;
            const score = Math.sqrt((dx * dx) + (dy * dy * 1.4));
            if (score < bestScore) {
                bestScore = score;
                activePoint = {
                    ...point,
                    name: seriesItem.name,
                    color: seriesItem.color
                };
            }
        });
    });

    return activePoint;
}

function handleChartHover(event) {
    if (!chartState?.canvas) return;
    const rect = chartState.canvas.getBoundingClientRect();
    const pointer = event.touches?.[0] || event;
    if (!pointer) return;
    const hoverX = pointer.clientX - rect.left;
    const hoverY = pointer.clientY - rect.top;
    const activePoint = getClosestChartPoint(hoverX, hoverY);
    if (!activePoint) return;
    chartState.activePoint = activePoint;
    drawChartHover(activePoint);
}

function clearChartHover() {
    if (!chartState) return;
    chartState.activePoint = null;
    drawVotePerformanceChart(lastVotePerformance);
    if (chartState.tooltip) {
        chartState.tooltip.classList.remove('visible');
        chartState.tooltip.setAttribute('aria-hidden', 'true');
    }
}

async function loadLeadStandings() {
    const response = await fetch('/results', { credentials: 'include' });
    const results = await response.json();
    if (!Array.isArray(results)) return;

    standingsResults = results;
    renderLeadStandings(filterLeadStandings());
}

function filterLeadStandings() {
    const term = leadSearchInput?.value.trim().toLowerCase() || '';
    if (!term) {
        return standingsResults;
    }

    return standingsResults.filter(result => {
        const searchText = [
            result.name,
            result.party,
            result.position,
            result.policy
        ].join(' ').toLowerCase();

        return searchText.includes(term);
    });
}

function renderLeadStandings(results) {
    const maxVotes = Math.max(...results.map(r => r.votes || 0), 1);

    if (!results.length) {
        leadList.innerHTML = `
            <div class="lead-empty">No candidates matched your search.</div>
        `;
        return;
    }

    leadList.innerHTML = results.map(result => `
        <div class="lead-item">
            <div class="lead-col lead-candidate">
                <strong>${result.name}</strong>
            </div>
            <div class="lead-col lead-party">
                <span>${result.party || 'Independent'}</span>
            </div>
            <div class="lead-col lead-votes">
                <span>${result.votes || 0} votes</span>
                <div class="lead-bar" style="width:${Math.min(((result.votes || 0) / maxVotes) * 150, 150)}px;height:4px;background:#2563eb;margin-top:6px;border-radius:999px;"></div>
            </div>
            <div class="lead-col lead-action">
                <button class="lead-profile-btn" onclick="viewCandidateProfile(${result.candidate_id})">View Profile</button>
            </div>
        </div>
    `).join('');
}

function viewCandidateProfile(candidateId) {
    if (!candidateId) return;
    window.location.href = `candidate-profile-admin.html?id=${candidateId}`;
}

async function loadVoters() {
    const response = await fetch('/admin/voters', { credentials: 'include' });
    const voters = await response.json();
    if (voters.error) {
        alert(voters.error);
        window.location.href = 'login.html';
        return;
    }

    voterResults = Array.isArray(voters) ? voters : [];
    renderVotersTable(filterVoters());
}

function filterVoters() {
    const term = String(votersSearchInput?.value || '').trim().toLowerCase();

    if (!term) {
        return voterResults;
    }

    return voterResults.filter(voter => {
        const searchText = [
            voter.voter_id,
            voter.citizen_id,
            voter.laser_id,
            voter.status ? 'enabled' : 'disabled',
            voter.has_voted ? 'yes' : 'no'
        ].join(' ').toLowerCase();

        return searchText.includes(term);
    });
}

function renderVotersTable(voters) {
    if (!voters.length) {
        votersTable.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">No voters matched your search.</td>
            </tr>
        `;
        return;
    }

    votersTable.innerHTML = voters.map(v => `
        <tr>
            <td data-label="ID">${v.voter_id}</td>
            <td data-label="Citizen ID">${v.citizen_id}</td>
            <td data-label="Laser ID">${v.laser_id}</td>
            <td data-label="Status">${v.status ? 'Enabled' : 'Disabled'}</td>
            <td data-label="Voted">${v.has_voted ? 'Yes' : 'No'}</td>
            <td data-label="Action" class="table-actions">
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

    candidateResults = Array.isArray(candidates) ? candidates : [];
    renderCandidatesTable(filterCandidates());
}

function filterCandidates() {
    const term = String(candidatesSearchInput?.value || '').trim().toLowerCase();

    if (!term) {
        return candidateResults;
    }

    return candidateResults.filter(candidate => {
        const searchText = [
            candidate.candidate_id,
            candidate.name,
            candidate.policy,
            candidate.status ? 'enabled' : 'disabled'
        ].join(' ').toLowerCase();

        return searchText.includes(term);
    });
}

function renderCandidatesTable(candidates) {
    if (!candidates.length) {
        candidatesTable.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">No candidates matched your search.</td>
            </tr>
        `;
        return;
    }

    candidatesTable.innerHTML = candidates.map(c => `
        <tr>
            <td data-label="ID">${c.candidate_id}</td>
            <td data-label="Name">${c.name}</td>
            <td data-label="Policy">${c.policy || 'No policy yet'}</td>
            <td data-label="Status">${c.status ? 'Enabled' : 'Disabled'}</td>
            <td data-label="Action" class="table-actions">
                <button class="btn ${c.status ? 'btn-danger' : 'btn-success'}" onclick="toggleCandidate(${c.candidate_id}, ${!c.status})">
                    ${c.status ? 'Disable' : 'Enable'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function registerVoter(event) {
    event.preventDefault();
    if (!registerVoterForm) return;

    const formData = new FormData(registerVoterForm);
    const citizenId = String(formData.get('citizen_id') || '').trim();
    const laserId = String(formData.get('laser_id') || '').trim();

    if (!citizenId || !laserId) {
        alert('Citizen ID and Laser ID are required.');
        return;
    }

    const response = await fetch('/admin/register-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            citizen_id: citizenId,
            laser_id: laserId
        })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        alert(result.message || 'Unable to register voter.');
        return;
    }

    registerVoterForm.reset();
    await loadVoters();
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

async function registerCandidate(event) {
    event.preventDefault();
    if (!registerCandidateForm) return;

    const formData = new FormData(registerCandidateForm);
    const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        party: String(formData.get('party') || '').trim(),
        position: String(formData.get('position') || '').trim(),
        password: String(formData.get('password') || '').trim(),
        image_url: String(formData.get('image_url') || '').trim(),
        vision: String(formData.get('vision') || '').trim(),
        manifesto: String(formData.get('manifesto') || '').trim()
    };

    if (!payload.name || !payload.email || !payload.party || !payload.position || !payload.password) {
        alert('Name, email, party, position, and password are required.');
        return;
    }

    const response = await fetch('/admin/register-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
        alert(result.message || 'Unable to register candidate.');
        return;
    }

    registerCandidateForm.reset();
    await loadCandidates();
    await loadDashboard();
    await loadLeadStandings();
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
    showSection(window.location.hash.replace('#', '') || 'overview');
    loadDashboard();
    loadVoters();
    loadCandidates();
    if (closeButton) {
        closeButton.addEventListener('click', () => toggleVoting());
    }

    if (leadSearchInput) {
        leadSearchInput.addEventListener('input', () => {
            renderLeadStandings(filterLeadStandings());
        });
    }

    if (votersSearchInput) {
        votersSearchInput.addEventListener('input', () => {
            renderVotersTable(filterVoters());
        });
    }

    if (candidatesSearchInput) {
        candidatesSearchInput.addEventListener('input', () => {
            renderCandidatesTable(filterCandidates());
        });
    }

    if (registerVoterForm) {
        registerVoterForm.addEventListener('submit', registerVoter);
    }

    if (registerCandidateForm) {
        registerCandidateForm.addEventListener('submit', registerCandidate);
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (sidebar?.classList.contains('is-open')) {
                closeSidebarDrawer();
            } else {
                openSidebarDrawer();
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebarDrawer);
    }

    if (chartCanvas) {
        chartCanvas.addEventListener('mousemove', handleChartHover);
        chartCanvas.addEventListener('mouseleave', clearChartHover);
        chartCanvas.addEventListener('touchstart', handleChartHover, { passive: true });
        chartCanvas.addEventListener('touchmove', handleChartHover, { passive: true });
        chartCanvas.addEventListener('touchend', clearChartHover);
    }
});

window.addEventListener('resize', () => {
    if (!isDrawerViewport()) {
        closeSidebarDrawer();
    }

    renderVotersTable(filterVoters());
    renderCandidatesTable(filterCandidates());

    if ((lastVotePerformance.labels || []).length || (lastVotePerformance.series || []).length) {
        if (resolveSectionId(currentSection) === 'overview') {
            drawVotePerformanceChart(lastVotePerformance);
        }
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeSidebarDrawer();
    }
});
