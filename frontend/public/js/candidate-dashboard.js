function showSection(sectionName, evt) {
    if (evt) {
        evt.preventDefault();
    }

    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    document.getElementById(sectionName + '-section').classList.add('active');

    const activeNav = evt?.target?.closest('.nav-item')
        || document.querySelector(`.nav-item[onclick*="'${sectionName}'"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    closeSidebar();

    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'results') {
        loadResults();
    }
}

function setSidebarState(isOpen) {
    const sidebar = document.getElementById('candidate-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const menuBtn = document.getElementById('menu-btn');
    if (!sidebar || !backdrop || !menuBtn) return;

    const shouldOpen = Boolean(isOpen) && window.innerWidth <= 767;
    sidebar.classList.toggle('open', shouldOpen);
    backdrop.classList.toggle('active', shouldOpen);
    menuBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    document.body.style.overflow = shouldOpen ? 'hidden' : '';
}

function toggleSidebar() {
    const sidebar = document.getElementById('candidate-sidebar');
    if (!sidebar) return;
    setSidebarState(!sidebar.classList.contains('open'));
}

function closeSidebar() {
    setSidebarState(false);
}

let candidateProfile = {};
let lastHourlyData = [];
let chartState = null;
let allResults = [];
let leaderboardResults = [];
let leaderboardCurrentRank = null;

function getProfileImageStorageKey(candidateId) {
    return `candidate_profile_image_${candidateId || 'default'}`;
}

function getStoredProfileImage(candidateId) {
    try {
        return localStorage.getItem(getProfileImageStorageKey(candidateId)) || '';
    } catch (error) {
        return '';
    }
}

function setStoredProfileImage(candidateId, imageSource) {
    try {
        localStorage.setItem(getProfileImageStorageKey(candidateId), imageSource);
    } catch (error) {
        alert('Unable to save this image in local storage.');
    }
}

function applyProfileImage(imageSource, candidateId = candidateProfile?.candidate_id) {
    if (!imageSource) return;
    const profileAvatar = document.getElementById('candidate-avatar');
    if (profileAvatar) profileAvatar.src = imageSource;

    const dashboardAvatar = document.getElementById('dashboard-avatar');
    if (dashboardAvatar) dashboardAvatar.src = imageSource;

    if (candidateProfile) {
        candidateProfile.image_url = imageSource;
    }

    if (candidateId) {
        setStoredProfileImage(candidateId, imageSource);
    }
}

function getResolvedProfileImage(profile) {
    return getStoredProfileImage(profile?.candidate_id) || profile?.image_url || '';
}

function openProfileImageFilePicker() {
    const fileInput = document.getElementById('profile-image-file');
    if (fileInput) {
        fileInput.click();
    }
}

function applyProfileImageUrl() {
    const imageUrl = window.prompt('Paste image URL');
    if (!imageUrl) {
        return;
    }
    applyProfileImage(imageUrl.trim());
}

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

    const resolvedImage = getResolvedProfileImage(profile);
    if (resolvedImage) {
        applyProfileImage(resolvedImage, profile.candidate_id);
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
        image_url: getResolvedProfileImage(profile) || profile.image_url
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

    const resolvedImage = getStoredProfileImage(data.candidateId) || data.image_url;
    const avatar = document.getElementById('dashboard-avatar');
    if (avatar && resolvedImage) avatar.src = resolvedImage;
}

function formatChartTimeLabel(label) {
    if (!label) return '';
    const [hourText, minuteText = '00'] = String(label).split(':');
    const hour = Number(hourText);
    const minute = String(minuteText).padStart(2, '0');
    if (Number.isNaN(hour)) return String(label);
    const period = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour}:${minute} ${period}`;
}

function renderChartLegend(series) {
    const legend = document.getElementById('chart-legend');
    if (!legend) return;
    legend.innerHTML = (Array.isArray(series) ? series : []).map(item => `
        <div class="legend-item">
            <span class="legend-line" style="background:${item.color}"></span>
            <span class="legend-label">${item.name}</span>
        </div>
    `).join('');
}

function renderLeaderboard(list, currentRank) {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;
    leaderboardResults = Array.isArray(list) ? list : [];
    leaderboardCurrentRank = currentRank;
    const query = document.getElementById('leaderboard-search-input')?.value || '';
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
        ? leaderboardResults.filter(row => String(row.name || '').toLowerCase().includes(normalizedQuery))
        : leaderboardResults;

    body.innerHTML = filtered.map(row => `
        <tr class="${row.rank === currentRank ? 'highlight' : ''}">
            <td>${row.rank}</td>
            <td>${row.name}</td>
            <td>${row.votes.toLocaleString()}</td>
            <td>${row.trend}</td>
        </tr>
    `).join('');

    if (!filtered.length) {
        body.innerHTML = `
            <tr>
                <td colspan="4">No candidates matched your search.</td>
            </tr>
        `;
    }
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

function renderChart(series) {
    const canvas = document.getElementById('votes-chart');
    const tooltip = document.getElementById('chart-tooltip');
    if (!canvas || !Array.isArray(series) || series.length === 0) return;
    lastHourlyData = series;
    renderChartLegend(series);

    const parentWidth = canvas.parentElement.clientWidth;
    if (parentWidth === 0) return;
    const height = 260;
    const padding = { top: 16, right: 16, bottom: 44, left: 52 };
    const plotWidth = Math.max(parentWidth - padding.left - padding.right, 1);
    const plotHeight = Math.max(height - padding.top - padding.bottom, 1);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = parentWidth * ratio;
    canvas.height = height * ratio;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, parentWidth, height);

    const baseLabels = series[0]?.points?.map(point => point.label) || [];
    const maxVotes = Math.max(
        ...series.flatMap(item => (item.points || []).map(point => Number(point.votes || 0))),
        0
    );
    const yMax = Math.max(24, Math.ceil((maxVotes + 12) / 3) * 3);
    const yStep = 3;
    const yValues = [];
    for (let value = 0; value <= yMax; value += yStep) {
        yValues.push(value);
    }
    if (yValues[yValues.length - 1] !== yMax) {
        yValues.push(yMax);
    }
    const stepX = baseLabels.length > 1 ? plotWidth / (baseLabels.length - 1) : 0;
    const seriesCoordinates = series.map(item => ({
        ...item,
        points: (item.points || []).map((point, index) => {
            const x = padding.left + (baseLabels.length > 1 ? index * stepX : plotWidth / 2);
            const displayVotes = Math.max(0, Math.min(yMax, Number(point.votes || 0)));
            const y = padding.top + plotHeight - (displayVotes / yMax) * plotHeight;
            return { ...point, x, y, displayVotes };
        })
    }));

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1;
    ctx.font = '11px Inter';
    ctx.fillStyle = '#94A3B8';

    yValues.forEach(value => {
        const y = padding.top + plotHeight - (value / yMax) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(parentWidth - padding.right, y);
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.fillText(value.toLocaleString(), padding.left - 10, y + 4);
    });

    baseLabels.forEach((label, index) => {
        const x = padding.left + (baseLabels.length > 1 ? index * stepX : plotWidth / 2);
        ctx.textAlign = index === 0 ? 'left' : index === baseLabels.length - 1 ? 'right' : 'center';
        ctx.fillText(formatChartTimeLabel(label), x, height - 14);
    });

    seriesCoordinates.forEach(item => {
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = item.color;
        item.points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

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
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(parentWidth - padding.right, padding.top + plotHeight);
    ctx.stroke();

    chartState = {
        canvas,
        tooltip,
        seriesCoordinates,
        padding,
        width: parentWidth,
        height
    };

    if (tooltip) {
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawChartHover(activePoint) {
    if (!chartState || !activePoint) return;
    renderChart(lastHourlyData);

    const { canvas, tooltip, padding, height } = chartState;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
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
        <span class="label">${formatChartTimeLabel(activePoint.label)}</span>
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
    if (!chartState || !chartState.canvas) return;
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
    renderChart(lastHourlyData);
    if (chartState.tooltip) {
        chartState.tooltip.classList.remove('visible');
        chartState.tooltip.setAttribute('aria-hidden', 'true');
    }
}

window.addEventListener('resize', () => {
    if (lastHourlyData.length) {
        renderChart(lastHourlyData);
    }

    if (window.innerWidth > 767) {
        closeSidebar();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-stats');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadDashboard());
    }

    const profileImageFile = document.getElementById('profile-image-file');
    if (profileImageFile) {
        profileImageFile.addEventListener('change', event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = loadEvent => {
                const imageSource = loadEvent.target?.result;
                if (typeof imageSource === 'string') {
                    applyProfileImage(imageSource);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    const resultsSearchInput = document.getElementById('results-search-input');
    if (resultsSearchInput) {
        resultsSearchInput.addEventListener('input', event => {
            renderResultsCards(allResults, event.target.value);
        });
    }

    const leaderboardSearchInput = document.getElementById('leaderboard-search-input');
    if (leaderboardSearchInput) {
        leaderboardSearchInput.addEventListener('input', () => {
            renderLeaderboard(leaderboardResults, leaderboardCurrentRank);
        });
    }

    const chartCanvas = document.getElementById('votes-chart');
    if (chartCanvas) {
        chartCanvas.addEventListener('mousemove', handleChartHover);
        chartCanvas.addEventListener('mouseleave', clearChartHover);
        chartCanvas.addEventListener('touchstart', handleChartHover, { passive: true });
        chartCanvas.addEventListener('touchmove', handleChartHover, { passive: true });
        chartCanvas.addEventListener('touchend', clearChartHover);
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeSidebar();
        }
    });
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

function renderResultsCards(results, query = '') {
    const container = document.getElementById('results-list');
    if (!container) return;

    const list = Array.isArray(results) ? results : [];
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
        ? list.filter(item =>
            String(item.name || '').toLowerCase().includes(normalizedQuery)
            || String(item.policy || '').toLowerCase().includes(normalizedQuery)
        )
        : list;

    if (!filtered.length) {
        container.innerHTML = `
            <div class="results-empty">
                No candidates matched "${query.trim()}". Try another name or keyword.
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((r, index) => `
        <div class="result-row">
            <div class="result-rank">#${index + 1}</div>
            <div class="result-candidate">
                <h3>${r.name}</h3>
                <span class="result-role">Candidate</span>
            </div>
            <div class="result-summary">${r.policy || 'No campaign statement has been added yet.'}</div>
            <div class="result-votes">
                <strong>${Number(r.votes || 0).toLocaleString()}</strong>
                <span>Votes</span>
            </div>
        </div>
    `).join('');
}

async function loadResults() {
    const response = await fetch('/results');
    allResults = await response.json();
    const searchInput = document.getElementById('results-search-input');
    renderResultsCards(allResults, searchInput?.value || '');
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = 'login.html';
}

// Initialize dashboard on load
loadCandidateProfile();
loadDashboard();
