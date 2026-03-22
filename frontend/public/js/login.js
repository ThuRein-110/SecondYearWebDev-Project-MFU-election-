document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
});

async function submitLogin() {
    const citizenId = document.getElementById('citizen-id').value.trim();
    const laserId = document.getElementById('laser-id').value.trim();

    if (!citizenId || !laserId) {
        alert('Please enter both Citizen ID and Laser ID.');
        return;
    }

    const response = await fetch('/login/voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ citizen_id: citizenId, laser_id: laserId })
    });

    const result = await response.json();
    if (result.success) {
        window.location.href = 'voter-dashboard.html';
    } else {
        alert(result.message || 'Login failed.');
    }
}
