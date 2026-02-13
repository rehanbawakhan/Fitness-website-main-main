document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username') || 'User';

    if (!isLoggedIn) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Display username
    document.getElementById('usernameDisplay').textContent = username;

    // Load and display user profile
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (userProfile) {
        document.getElementById('profileUsername').textContent = userProfile.username || '';
        document.getElementById('profileFullName').textContent = userProfile.fullName || '';
        document.getElementById('profileEmail').textContent = userProfile.email || '';
        document.getElementById('profileAge').textContent = userProfile.age || '';
    }

    // Logout functionality with return to previous page
    document.getElementById('logoutBtn').addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('userProfile');

        // Go back to previous page or fallback
        if (document.referrer && document.referrer !== window.location.href) {
            window.location.href = document.referrer;
        } else {
            window.location.href = 'home.html'; // fallback
        }
    });

    // Workout day selector
    const days = document.querySelectorAll('.day');
    const exercises = document.querySelectorAll('.workout-exercises');

    days.forEach(day => {
        day.addEventListener('click', function () {
            days.forEach(d => d.classList.remove('active'));
            this.classList.add('active');

            exercises.forEach(ex => ex.classList.add('hidden'));
            const dayId = this.getAttribute('data-day');
            document.getElementById(`${dayId}-exercises`)?.classList.remove('hidden');
        });
    });

    // Set progress circle values
    const progressCircles = document.querySelectorAll('.progress-circle');
    progressCircles.forEach(circle => {
        const value = circle.getAttribute('data-value');
        circle.style.setProperty('--value', `${value * 3.6}deg`);
    });

    // Set Monday as active by default
    if (days.length > 0) days[0].click();

    // Scroll animation for cards
    const cards = document.querySelectorAll('.card');
    const animateOnScroll = function () {
        cards.forEach(card => {
            const cardPosition = card.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;

            if (cardPosition < screenPosition) {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }
        });
    };

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Run once on load
});
