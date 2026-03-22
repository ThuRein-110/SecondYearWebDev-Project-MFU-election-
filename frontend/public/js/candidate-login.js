document.addEventListener('DOMContentLoaded', () => {
    const identifierEl = document.getElementById('candidate-identifier');
    const passwordEl = document.getElementById('candidate-password');
    if (identifierEl) {
        identifierEl.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                passwordEl?.focus();
            }
        });
    }
});

async function submitCandidateLogin() {
    let identifier = document.getElementById('candidate-identifier').value.trim();
    const password = document.getElementById('candidate-password').value.trim();

    if (!identifier || !password) {
        alert('Please enter your Candidate ID or email and password.');
        return;
    }

    const response = await fetch('/login/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
    });

    const result = await response.json();

    if (result.success) {
        window.location.href = 'candidate-dashboard.html';
    } else {
        alert(result.message || 'Candidate login failed.');
    }
}
