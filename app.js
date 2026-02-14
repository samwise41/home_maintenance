// Function to fetch the data
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        renderDashboard(data.items);
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

// Function to calculate status (Overdue, Due Soon, OK)
function getStatus(nextDueDateStr) {
    const today = new Date();
    today.setHours(0,0,0,0); // Strip time for accurate comparison
    
    const nextDue = new Date(nextDueDateStr);
    
    // Calculate difference in days
    const diffTime = nextDue - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays < 0) {
        return { class: 'status-overdue', text: '🚨 Overdue' };
    } else if (diffDays <= 30) {
        return { class: 'status-soon', text: '⚠️ Due Soon' };
    } else {
        return { class: 'status-ok', text: '✅ OK' };
    }
}

// Function to draw the items on the screen
function renderDashboard(items) {
    const listContainer = document.getElementById('dashboard-list');
    listContainer.innerHTML = ''; // Clear "Loading..." text

    // Sort items by next_due date (closest first)
    items.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    items.forEach(item => {
        const status = getStatus(item.next_due);
        
        // Format date nicely (e.g., "Feb 28, 2026")
        const dateObj = new Date(item.next_due);
        // Fix timezone offset issue to ensure correct date display locally
        const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(dateObj.getTime() + userTimezoneOffset);
        const formattedDate = adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-info">
                <h3>${item.name}</h3>
                <p>📍 ${item.location} | ⏱️ Every ${item.frequency_months} months</p>
                <p><strong>Next Due:</strong> ${formattedDate} <span class="badge ${status.class}">${status.text}</span></p>
            </div>
            <div class="actions">
                <button class="btn-primary" onclick="alert('Marking complete coming in Step 2!')">✅ Done</button>
                <button class="btn-outline" onclick="alert('Edit form coming in Step 2!')">✏️ Edit</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Initialize the app when the page loads
loadData();
