document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Simple validation
        if (username === '' || password === '') {
            alert('Please enter both username and password');
            return;
        }
        
        // In a real app, you would validate with a server here
        // For demo purposes, we'll use a simple check
        if (username === 'kaif' && password === 'kaif123') {
            // Store login state in localStorage
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            alert('Invalid credentials. Try username: user, password: fitness123');
        }
    });
    
    // Add animation to input fields on focus
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.querySelector('i').style.color = '#1a2a6c';
            this.parentNode.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentNode.querySelector('i').style.color = '#777';
            this.parentNode.style.transform = 'scale(1)';
        });
    });
});