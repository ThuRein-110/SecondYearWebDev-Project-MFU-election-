async function loadCandidates() {
    const response = await fetch('/candidates');
    const candidates = await response.json();
    document.getElementById('candidates').innerHTML = candidates.map(c => `
        <div class="candidate" onclick="vote(${c.id})">
            <h3>${c.name}</h3>
            <p>${c.policy}</p>
        </div>
    `).join('');
}

async function vote(candidateId) {
    if (confirm('Are you sure you want to cast your vote? This action cannot be undone.')) {
        const response = await fetch('/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_id: candidateId })
        });
        const result = await response.json();
        alert(result.success ? 'Vote cast successfully! Thank you for participating.' : result.message);
        if (result.success) window.location.href = 'voter-dashboard.html';
    }
}

loadCandidates();