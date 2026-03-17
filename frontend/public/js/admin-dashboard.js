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
    } else if (sectionName === 'voters') {
        loadVoters();
    } else if (sectionName === 'candidates') {
        loadCandidates();
    } else if (sectionName === 'results') {
        loadResults();
    }
}

async function loadDashboard() {
    const response = await fetch('/dashboard');
    const data = await response.json();
    if (data.error) {
        alert(data.error);
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('stats').innerHTML = `
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

    // Update voting card
    const votingCard = document.getElementById('voting-card');
    const votingTitle = document.getElementById('voting-title');
    if (data.voting_enabled) {
        votingTitle.textContent = '🔴 Disable Voting';
        votingCard.classList.add('danger');
    } else {
        votingTitle.textContent = '🟢 Enable Voting';
        votingCard.classList.remove('danger');
    }
}

async function loadVoters() {
    const response = await fetch('/admin/voters');
    const voters = await response.json();
    const tbody = document.querySelector('#voters-table tbody');
    tbody.innerHTML = voters.map(v => `
        <tr>
            <td>${v.id}</td>
            <td>${v.citizen_id}</td>
            <td>${v.laser_id}</td>
            <td>${v.status ? 'Enabled' : 'Disabled'}</td>
            <td>${v.has_voted ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn ${v.status ? 'btn-danger' : 'btn-success'}" onclick="toggleVoter(${v.id}, ${!v.status})">
                    ${v.status ? 'Disable' : 'Enable'}
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadCandidates() {
    const response = await fetch('/admin/candidates');
    const candidates = await response.json();
    const tbody = document.querySelector('#candidates-table tbody');
    tbody.innerHTML = candidates.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.candidate_id}</td>
            <td>${c.name}</td>
            <td>${c.policy}</td>
            <td>${c.status ? 'Enabled' : 'Disabled'}</td>
            <td>
                <button class="btn ${c.status ? 'btn-danger' : 'btn-success'}" onclick="toggleCandidate(${c.id}, ${!c.status})">
                    ${c.status ? 'Disable' : 'Enable'}
                </button>
            </td>
        </tr>
    `).join('');
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

async function toggleVoting() {
    const votingTitle = document.getElementById('voting-title');
    const enabled = votingTitle.textContent.includes('Enable');
    const response = await fetch('/admin/toggle-voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
    });
    const result = await response.json();
    if (result.success) loadDashboard();
}

async function toggleVoter(id, status) {
    await fetch('/admin/toggle-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    loadVoters();
}

async function toggleCandidate(id, status) {
    await fetch('/admin/toggle-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    loadCandidates();
}

async function logout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = 'login.html';
}

// Initialize dashboard on load
loadDashboard();