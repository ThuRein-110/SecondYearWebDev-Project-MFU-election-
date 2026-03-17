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
}

async function updateInfo() {
    const name = document.getElementById('name').value;
    const policy = document.getElementById('policy').value;
    const response = await fetch('/candidate/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, policy })
    });
    const result = await response.json();
    alert(result.success ? 'Information updated successfully' : 'Update failed');
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
loadDashboard();