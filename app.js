let appData = { items: [] };

// --- MODAL CONTROLLERS ---

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = "none";
};

// Open as ADD NEW
window.openAddModal = function() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = ""; // Clear ID
    document.getElementById('modalTitle').innerText = "Add New Task";
    document.getElementById('lastCompletedContainer').style.display = "block"; // Show date field
    document.getElementById('itemLastCompleted').value = new Date().toISOString().split('T')[0];
    document.getElementById('itemLastCompleted').required = true;
    document.getElementById('itemModal').style.display = "block";
};

// Open as EDIT
window.openEditModal = function(id) {
    const item = appData.items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('itemForm').reset();
    document.getElementById('modalTitle').innerText = "Edit Task";
    
    // Fill the form with existing data
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemLocation').value = item.location;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemFrequency').value = item.frequency_months;
    
    // Hide the initial 'last completed' field when editing
    document.getElementById('lastCompletedContainer').style.display = "none";
    document.getElementById('itemLastCompleted').required = false;

    document.getElementById('itemModal').style.display = "block";
};

// Open MARK COMPLETE
window.openLogModal = function(id) {
    const item = appData.items.find(i => i.id === id);
    if (!item) return; 
    
    document.getElementById('logForm').reset();
    document.getElementById('logItemId').value = item.id;
    document.getElementById('logItemName').innerText = `Task: ${item.name} (${item.location})`;
    document.getElementById('logDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('logModal').style.display = "block";
};

// --- LOGIC FUNCTIONS ---

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

// --- UI RENDERING ---

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
                <button class="btn-outline" onclick="window.openEditModal('${item.id}')">✏️ Edit</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// --- DATA FETCHING ---

async function loadData() {
    try {
        // Use relative path for GitHub pages compatibility
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error("Could not fetch data.json");
        appData = await response.json();
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p style="color:red; font-weight:bold;">Error: ${error.message}. <br><br>Make sure data.json is uploaded to your GitHub repo.</p>`;
    }
}

// --- FORM SUBMISSIONS ---

document.addEventListener('DOMContentLoaded', () => {
    
    // Handle Add OR Edit Submission
    document.getElementById('itemForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const idToEdit = document.getElementById('itemId').value;
        const name = document.getElementById('itemName').value;
        const location = document.getElementById('itemLocation').value;
        const category = document.getElementById('itemCategory').value;
        const frequency = parseInt(document.getElementById('itemFrequency').value);

        if (idToEdit) {
            // WE ARE EDITING AN EXISTING ITEM
            const index = appData.items.findIndex(i => i.id === idToEdit);
            if (index > -1) {
                appData.items[index].name = name;
                appData.items[index].location = location;
                appData.items[index].category = category;
                appData.items[index].frequency_months = frequency;
                
                // If frequency changed, recalculate the next due date based on the latest history
                if (appData.items[index].history && appData.items[index].history.length > 0) {
                    const latestHistoryDate = appData.items[index].history[appData.items[index].history.length - 1].date_completed;
                    appData.items[index].next_due = calculateNextDue(latestHistoryDate, frequency);
                }
            }
        } else {
            // WE ARE ADDING A BRAND NEW ITEM
            const lastCompleted = document.getElementById('itemLastCompleted').value;
            const newItem = {
                id: 'item-' + Date.now(),
                name: name,
                location: location,
                category: category,
                frequency_months: frequency,
                next_due: calculateNextDue(lastCompleted, frequency),
                history: [{ date_completed: lastCompleted, notes: "Initial entry" }]
            };
            appData.items.push(newItem);
        }

        window.closeModal('itemModal');
        renderDashboard();
    });

    // Handle Mark Complete Submission
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
