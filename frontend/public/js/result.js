async function loadResults() {
    const response = await fetch('/results');
    const results = await response.json();
    document.getElementById('results-list').innerHTML = results.map((r, index) => `
        <div class="result">
            <div class="rank">${index + 1}</div>
            <h3>${r.name}</h3>
            <p>${r.policy}</p>
            <div class="votes">Votes: ${r.votes}</div>
        </div>
    `).join('');
}

loadResults();