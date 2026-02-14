let appData = { items: [] }; // Stores our data in memory

// 1. Initialize and Load Data
async function loadData() {
    try {
        const response = await fetch('data.json');
        appData = await response.json();
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p>Error loading data: ${error.message}</p>`;
    }
}

// 2. Helper: Calculate Next Due Date (Adds X months to a date string)
function calculateNextDue(dateString, monthsToAdd) {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + parseInt(monthsToAdd));
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

// 3. Helper: Get Status (Colors)
function getStatus(nextDueDateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextDue = new Date(nextDueDateStr);
    
    const diffTime = nextDue - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays < 0) return { class: 'status-overdue', text: '🚨 Overdue' };
    if (diffDays <= 30) return { class: 'status-soon', text: '⚠️ Due Soon' };
    return { class: 'status-ok', text: '✅ OK' };
}

// 4. Render the Dashboard
function renderDashboard() {
    const listContainer = document.getElementById('dashboard-list');
    listContainer.innerHTML = ''; 

    appData.items.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    appData.items.forEach(item => {
        const status = getStatus(item.next_due);
        const dateObj = new Date(item.next_due);
        const adjustedDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
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
                <button class="btn-success" onclick="openLogModal('${item.id}', '${item.name}')">✅ Done</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// 5. Modal Controllers
function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function openAddModal() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemLastCompleted').value = new Date().toISOString().split('T')[0]; // Default to today
    document.getElementById('itemModal').style.display = "block";
}

function openLogModal(id, name) {
    document.getElementById('logForm').reset();
    document.getElementById('logItemId').value = id;
    document.getElementById('logItemName').innerText = `Task: ${name}`;
    document.getElementById('logDate').value = new Date().toISOString().split('T')[0]; // Default to today
    document.getElementById('logModal').style.display = "block";
}

// 6. Handle Form Submissions

// ADD NEW ITEM
document.getElementById('itemForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Stop page refresh
    
    const name = document.getElementById('itemName').value;
    const location = document.getElementById('itemLocation').value;
    const category = document.getElementById('itemCategory').value;
    const frequency = document.getElementById('itemFrequency').value;
    const lastCompleted = document.getElementById('itemLastCompleted').value;
    
    // Create unique ID
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const nextDue = calculateNextDue(lastCompleted, frequency);

    const newItem = {
        id: id,
        name: name,
        location: location,
        category: category,
        frequency_months: parseInt(frequency),
        next_due: nextDue,
        history: [{ date_completed: lastCompleted, notes: "Initial entry" }]
    };

    appData.items.push(newItem);
    closeModal('itemModal');
    renderDashboard();
});

// LOG MAINTENANCE (MARK COMPLETE)
document.getElementById('logForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('logItemId').value;
    const dateCompleted = document.getElementById('logDate').value;
    const notes = document.getElementById('logNotes').value;
    
    // Find the item in our data array
    const itemIndex = appData.items.findIndex(item => item.id === id);
    
    if (itemIndex > -1) {
        // Add to history
        appData.items[itemIndex].history.push({
            date_completed: dateCompleted,
            notes: notes
        });
        
        // Calculate and update the new next_due date
        const newNextDue = calculateNextDue(dateCompleted, appData.items[itemIndex].frequency_months);
        appData.items[itemIndex].next_due = newNextDue;
        
        closeModal('logModal');
        renderDashboard(); // Re-draw screen to show new dates
    }
});

// Start the app
loadData();
