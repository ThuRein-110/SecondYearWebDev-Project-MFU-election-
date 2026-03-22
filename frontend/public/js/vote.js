async function loadCandidates() {
    const response = await fetch('/candidates');
    const candidates = await response.json();
    const container = document.getElementById('candidates');
    container.innerHTML = candidates.map(candidateVoteCard).join('');
}

function candidateVoteCard(candidate) {
    const votes = candidate.votes || 0;
    return `
        <article class="vote-card">
            <img
                src="${resolveCandidateImage(candidate)}"
                alt="${candidate.name || 'Candidate portrait'}"
                class="candidate-photo"
                onerror="this.src='https://randomuser.me/api/portraits/men/1.jpg'"
            />
            <div class="vote-card-body">
                <div class="candidate-headline">
                    <span class="candidate-badge">CAN-${String(candidate.candidate_id).padStart(3, '0')}</span>
                    <h3>${candidate.name || 'Candidate'}</h3>
                    <span class="party">${candidate.party || 'Independent'}</span>
                    <span class="position">${candidate.position || 'President'}</span>
                </div>
                <p class="policy">"${candidate.policy || 'Policy details coming soon.'}"</p>
                <div class="votes-count">🗳 ${votes} Votes</div>
                <div class="vote-card-actions">
                    <button class="profile-btn" type="button" onclick="viewCandidate(${candidate.candidate_id})">View Profile</button>
                    <button class="primary-btn" type="button" onclick="vote(${candidate.candidate_id})">Vote</button>
                </div>
            </div>
        </article>
    `;
}

function resolveCandidateImage(candidate) {
    if (candidate.image_url && candidate.image_url.startsWith('http')) {
        return candidate.image_url;
    }
    const seed = Number(candidate.candidate_id) || 1;
    return `https://randomuser.me/api/portraits/men/${seed % 90}.jpg`;
}

function viewCandidate(candidateId) {
    window.location.href = `candidate-profile.html?id=${candidateId}`;
}

async function vote(candidateId) {
    if (!candidateId) {
        alert('Unable to determine the selected candidate. Please try again.');
        return;
    }

    if (confirm('Are you sure you want to cast your vote? This action cannot be undone.')) {
        const response = await fetch('/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ candidate_id: candidateId })
        });
        const result = await response.json();
        alert(result.success ? 'Vote cast successfully! Thank you for participating.' : result.message);
        if (result.success) {
            storeVoteLocally(candidateId);
            try {
                localStorage.setItem('return_anchor', '#candidates-section');
            } catch (err) {
                sessionStorage.setItem('return_anchor', '#candidates-section');
            }
            window.location.href = 'receipt.html';
        }
    }
}

function storeVoteLocally(candidateId) {
    if (typeof cacheVotedCandidate === 'function') {
        cacheVotedCandidate(candidateId);
    }
}

loadCandidates();
