let appData = { items: [] };

// Make modal functions globally accessible to HTML buttons
window.openAddModal = function() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemLastCompleted').value = new Date().toISOString().split('T')[0];
    document.getElementById('itemModal').style.display = "block";
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = "none";
};

window.openLogModal = function(id) {
    const item = appData.items.find(i => i.id === id);
    if (!item) return; // safety check
    
    document.getElementById('logForm').reset();
    document.getElementById('logItemId').value = item.id;
    document.getElementById('logItemName').innerText = `Task: ${item.name} (${item.location})`;
    document.getElementById('logDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('logModal').style.display = "block";
};

// Logic Functions
function calculateNextDue(dateString, monthsToAdd) {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + parseInt(monthsToAdd));
    return date.toISOString().split('T')[0];
}

function getStatus(nextDueDateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextDue = new Date(nextDueDateStr);
    const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)); 

    if (diffDays < 0) return { class: 'status-overdue', text: '🚨 Overdue' };
    if (diffDays <= 30) return { class: 'status-soon', text: '⚠️ Due Soon' };
    return { class: 'status-ok', text: '✅ OK' };
}

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
                <button class="btn-success" onclick="window.openLogModal('${item.id}')">✅ Done</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Could not fetch data.json (Are you running a local server?)");
        appData = await response.json();
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p style="color:red; font-weight:bold;">Error: ${error.message}</p>`;
    }
}

// Wait for the HTML to fully load before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
    
    // Form Submit: Add New Item
    document.getElementById('itemForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('itemName').value;
        const frequency = document.getElementById('itemFrequency').value;
        const lastCompleted = document.getElementById('itemLastCompleted').value;
        
        const newItem = {
            id: 'item-' + Date.now(),
            name: name,
            location: document.getElementById('itemLocation').value,
            category: document.getElementById('itemCategory').value,
            frequency_months: parseInt(frequency),
            next_due: calculateNextDue(lastCompleted, frequency),
            history: [{ date_completed: lastCompleted, notes: "Initial entry" }]
        };

        appData.items.push(newItem);
        window.closeModal('itemModal');
        renderDashboard();
    });

    // Form Submit: Log Maintenance (Done)
    document.getElementById('logForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('logItemId').value;
        const dateCompleted = document.getElementById('logDate').value;
        
        const itemIndex = appData.items.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            appData.items[itemIndex].history.push({
                date_completed: dateCompleted,
                notes: document.getElementById('logNotes').value
            });
            appData.items[itemIndex].next_due = calculateNextDue(dateCompleted, appData.items[itemIndex].frequency_months);
            
            window.closeModal('logModal');
            renderDashboard();
        }
    });

    // Boot up the app
    loadData();
});
