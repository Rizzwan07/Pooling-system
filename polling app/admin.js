document.getElementById('pollForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const question = document.getElementById('question').value;
    
    // Collect all option values (ignore empty ones)
    const options = [];
    
    // Check each option input
    for (let i = 1; i <= 5; i++) {
        const optionElem = document.getElementById(`option${i}`);
        if (optionElem && optionElem.value.trim() !== '') {
            options.push(optionElem.value.trim());
        }
    }
    
    // Validate that we have at least 2 options
    if (options.length < 2) {
        alert("Please provide at least 2 options for the poll.");
        return;
    }

    const pollData = {
        question: question,
        options: options
    };

    console.log("Sending poll data:", pollData);

    // Save to MongoDB via API
    fetch('/api/polls', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pollData)
    })
    .then(response => {
        console.log("Response status:", response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error("Error response:", text);
                throw new Error('Network response was not ok: ' + text);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Poll created successfully:', data);
        loadPolls(); // Reload polls after creating a new one
        document.getElementById('pollForm').reset();
    })
    .catch(error => {
        console.error('Detailed error creating poll:', error);
        alert('Failed to create poll. Please try again. Error: ' + error.message);
    });
});

function displayPoll(poll) {
    const pollList = document.getElementById('pollList');
    
    const pollElement = document.createElement('div');
    pollElement.classList.add('poll');
    pollElement.dataset.id = poll._id;
    
    let optionsHTML = `<h3>${poll.question}</h3>`;
    
    // Add each option and its vote count
    for (let i = 0; i < poll.options.length; i++) {
        optionsHTML += `<p>${poll.options[i]}: ${poll.votes[i]} votes</p>`;
    }

    // Add delete button
    optionsHTML += `<button class="delete-btn" data-id="${poll._id}">Delete Poll</button>`;
    
    pollElement.innerHTML = optionsHTML;
    pollList.appendChild(pollElement);

    // Add event listener to delete button
    pollElement.querySelector('.delete-btn').addEventListener('click', function() {
        deletePoll(poll._id);
    });
}

function loadPolls() {
    // Fetch polls from MongoDB via API
    fetch('/api/polls')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(polls => {
        const pollList = document.getElementById('pollList');
        pollList.innerHTML = '';
        
        if (polls.length === 0) {
            pollList.innerHTML = '<p>No polls available.</p>';
            return;
        }
        
        polls.forEach(poll => {
            displayPoll(poll);
        });
    })
    .catch(error => {
        console.error('Error loading polls:', error);
        document.getElementById('pollList').innerHTML = '<p>Failed to load polls. Please refresh the page.</p>';
    });
}

function deletePoll(pollId) {
    if (!confirm('Are you sure you want to delete this poll?')) {
        return;
    }
    
    fetch(`/api/polls/${pollId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Poll deleted successfully:', data);
        loadPolls(); // Reload polls after deletion
    })
    .catch(error => {
        console.error('Error deleting poll:', error);
        alert('Failed to delete poll. Please try again.');
    });
}

// Add option button
document.getElementById('addOptionBtn').addEventListener('click', function() {
    const optionsContainer = document.getElementById('optionsContainer');
    const optionCount = optionsContainer.children.length + 1;
    
    if (optionCount <= 5) {
        const newOption = document.createElement('input');
        newOption.type = 'text';
        newOption.id = `option${optionCount}`;
        newOption.placeholder = `Option ${optionCount}`;
        optionsContainer.appendChild(newOption);
    }
    
    // Hide add button if we reached 5 options
    if (optionCount >= 5) {
        document.getElementById('addOptionBtn').style.display = 'none';
    }
});

// Load polls when the admin page loads
window.addEventListener('load', () => {
    // Test API connectivity
    testApiConnection();
    loadPolls();
});

// Test function to check API connectivity
function testApiConnection() {
    fetch('/api/test')
        .then(response => {
            if (!response.ok) {
                throw new Error('API test failed: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('API connectivity test successful:', data);
        })
        .catch(error => {
            console.error('API connectivity test failed:', error);
            alert('API connectivity issue detected. Check server connection.');
        });
}