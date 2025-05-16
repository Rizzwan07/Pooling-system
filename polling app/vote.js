// Check if user is logged in
function checkLoggedIn() {
    return localStorage.getItem("currentUser") !== null;
}

// Handle login
function login(userId, password) {
    // In a real app, you would validate credentials against a database
    // For this demo, we'll just store the user ID
    localStorage.setItem("currentUser", userId);
    
    // Hide login form and show the poll
    document.getElementById('loginForm').classList.add('hidden');
    loadAndDisplayPoll();
}

// Handle logout
function logout() {
    localStorage.removeItem("currentUser");
    // Show login form again
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('pollDisplay').innerHTML = '';
}

// Load and display available polls
function loadAndDisplayPoll() {
    // Fetch polls from API
    fetch('/api/polls')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(polls => {
        if (polls.length === 0) {
            document.getElementById('pollDisplay').innerHTML = '<p>No active polls available.</p>';
            return;
        }
        
        // Display the first poll (or you could display all polls)
        displayPoll(polls[0]);
    })
    .catch(error => {
        console.error('Error loading polls:', error);
        document.getElementById('pollDisplay').innerHTML = '<p>Failed to load polls. Please refresh the page.</p>';
    });
}

// Load content when the page loads
window.addEventListener('load', () => {
    // Check if we need to show login form or poll
    if (checkLoggedIn()) {
        document.getElementById('loginForm').classList.add('hidden');
        loadAndDisplayPoll();
    } else {
        document.getElementById('loginForm').classList.remove('hidden');
    }
    
    // Add event listener to login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;
        login(userId, password);
    });
});

function submitVote(pollId, optionIndex) {
    // Get the current user
    const userId = localStorage.getItem("currentUser");
    if (!userId) {
        alert("Please log in to vote.");
        return;
    }
    
    // Submit vote to API
    fetch(`/api/polls/${pollId}/vote`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            optionIndex: optionIndex,
            userId: userId
        })
    })
    .then(response => {
        if (response.status === 400) {
            return response.json().then(data => {
                throw new Error(data.message || 'You have already voted on this poll.');
            });
        }
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return response.json();
    })
    .then(data => {
        // Show popup for successful vote
        showPopup();
        setTimeout(hidePopup, 3000);
        
        // Reload the poll to show updated results
        loadAndDisplayPoll();
    })
    .catch(error => {
        alert(error.message || 'Failed to submit vote. Please try again.');
    });
}

function displayPoll(poll) {
    const container = document.getElementById('pollDisplay');
    if (!poll) {
        container.innerHTML = '<p>No active polls available.</p>';
        return;
    }
    
    // Get the current user
    const userId = localStorage.getItem("currentUser");
    if (!userId) {
        // This shouldn't happen normally since we check login status
        container.innerHTML = '<p>Please log in to see polls.</p>';
        return;
    }
    
    // Check if user has already voted on this poll
    // We'll make a separate API call to check this
    fetch(`/api/polls/${poll._id}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(pollDetails => {
        // Calculate total votes for percentage
        const totalVotes = pollDetails.votes.reduce((sum, current) => sum + current, 0);
        
        let pollHTML = `
            <div class="poll" style="text-align: center;">
                <h3>${pollDetails.question}</h3>
        `;
        
        // We'll add voting buttons and assume user can vote until we learn otherwise
        for (let i = 0; i < pollDetails.options.length; i++) {
            pollHTML += `<button class="vote-button" onclick="submitVote('${pollDetails._id}', ${i})"> ${pollDetails.options[i]}</button>`;
        }
        
        pollHTML += `</div>`;
        
        // Add current results with animated bars
        pollHTML += `
            <div style="margin-top: 20px; text-align: center;">
                <h4>Current Results:</h4>
        `;
        
        for (let i = 0; i < pollDetails.options.length; i++) {
            const percentage = totalVotes > 0 ? (pollDetails.votes[i] / totalVotes * 100).toFixed(1) : 0;
            
            pollHTML += `
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span><strong>${pollDetails.options[i]}:</strong></span>
                        <span>${pollDetails.votes[i]} votes (${percentage}%)</span>
                    </div>
                    <div class="result-bar-container">
                        <div class="result-bar" style="width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        }
        
        pollHTML += `</div>`;
        
        // Add logout button
        pollHTML += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="logout()" style="padding: 12px 24px; background: linear-gradient(45deg, #EF4444, #B91C1C); border: none; border-radius: 12px; color: #fff; cursor: pointer; font-weight: 500; transition: all 0.3s ease;">Logout</button>
            </div>
        `;
        
        container.innerHTML = pollHTML;
        
        // Add entrance animation for the poll
        setTimeout(() => {
            const pollElement = container.querySelector('.poll');
            if (pollElement) {
                pollElement.style.opacity = '0';
                pollElement.style.transform = 'translateY(20px)';
                pollElement.style.transition = 'all 0.5s ease';
                
                setTimeout(() => {
                    pollElement.style.opacity = '1';
                    pollElement.style.transform = 'translateY(0)';
                }, 100);
            }
        }, 0);
    })
    .catch(error => {
        console.error('Error displaying poll:', error);
        container.innerHTML = '<p>Failed to load poll details. Please refresh the page.</p>';
    });
}

function showPopup() {
    const popup = document.getElementById('popup');
    popup.classList.remove('hidden');
    // Use the visible class for animation
    setTimeout(() => {
        popup.classList.add('visible');
    }, 10);
}

function hidePopup() {
    const popup = document.getElementById('popup');
    popup.classList.remove('visible');
    // Wait for animation to complete before hiding
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 500);
}