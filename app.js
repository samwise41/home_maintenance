let appData = { items: [] };
let fileSha = ""; // Required by GitHub API to update a file

// --- MODAL CONTROLLERS ---

window.closeModal = function(modalId) { document.getElementById(modalId).style.display = "none"; };

window.openSettingsModal = function() {
    document.getElementById('ghUser').value = localStorage.getItem('ghUser') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('ghRepo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('ghToken') || '';
    document.getElementById('settingsModal').style.display = "block";
};

window.openAddModal = function() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = ""; 
    document.getElementById('modalTitle').innerText = "Add New Task";
    document.getElementById('lastCompletedContainer').style.display = "block"; 
    document.getElementById('itemLastCompleted').value = new Date().toISOString().split('T')[0];
    document.getElementById('itemLastCompleted').required = true;
    document.getElementById('itemModal').style.display = "block";
};

window.openEditModal = function(id) {
    const item = appData.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('itemForm').reset();
    document.getElementById('modalTitle').innerText = "Edit Task";
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemLocation').value = item.location;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemFrequency').value = item.frequency_months;
    document.getElementById('lastCompletedContainer').style.display = "block";
    document.getElementById('itemLastCompleted').required = true;
    
    if (item.history && item.history.length > 0) {
        document.getElementById('itemLastCompleted').value = item.history[item.history.length - 1].date_completed;
    } else {
        document.getElementById('itemLastCompleted').value = ""; 
    }
    document.getElementById('itemModal').style.display = "block";
};

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

function showStatusMsg(msg, color="green") {
    const el = document.getElementById('status-message');
    el.innerText = msg;
    el.style.color = color;
    setTimeout(() => el.innerText = "", 3000);
}

// --- GITHUB API SYNCING ---

async function saveToGitHub() {
    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');

    if (!user || !repo || !token) {
        showStatusMsg("⚠️ Data updated on screen, but not saved. Please click ⚙️ Settings to connect GitHub.", "orange");
        return;
    }

    showStatusMsg("⏳ Saving to GitHub...", "blue");

    try {
        const jsonString = JSON.stringify(appData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));
        
        const url = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Updated via Home Tracker App",
                content: base64Content,
                sha: fileSha
            })
        });

        if (!response.ok) throw new Error("API Save Failed");
        const result = await response.json();
        fileSha = result.content.sha; 
        showStatusMsg("✅ Successfully saved to GitHub!");
    } catch (error) {
        showStatusMsg("❌ Error saving to GitHub. Check settings.", "red");
        console.error(error);
    }
}

async function loadData() {
    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');

    try {
        let response;
        if (user && repo && token) {
            const url = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
            response = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
            
            if (!response.ok) throw new Error("Could not connect to GitHub Repo.");
            const result = await response.json();
            fileSha = result.sha; 
            const jsonString = decodeURIComponent(escape(atob(result.content)));
            appData = JSON.parse(jsonString);
        } else {
            response = await fetch('./data.json');
            appData = await response.json();
        }
        renderDashboard();
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p style="color:red; font-weight:bold;">Error: ${error.message}</p>`;
    }
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

// --- FORM SUBMISSIONS ---

// Save Settings
document.getElementById('settingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    localStorage.setItem('ghUser', document.getElementById('ghUser').value.trim());
    localStorage.setItem('ghRepo', document.getElementById('ghRepo').value.trim());
    localStorage.setItem('ghToken', document.getElementById('ghToken').value.trim());
    window.closeModal('settingsModal');
    showStatusMsg("⏳ Loading latest data from GitHub...", "blue");
    loadData(); 
});

// Handle Add OR Edit Submission
document.getElementById('itemForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const idToEdit = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const location = document.getElementById('itemLocation').value;
    const category = document.getElementById('itemCategory').value;
    const frequency = parseInt(document.getElementById('itemFrequency').value);
    const lastCompletedDate = document.getElementById('itemLastCompleted').value;

    if (idToEdit) {
        const index = appData.items.findIndex(i => i.id === idToEdit);
        if (index > -1) {
            appData.items[index].name = name;
            appData.items[index].location = location;
            appData.items[index].category = category;
            appData.items[index].frequency_months = frequency;
            if (appData.items[index].history && appData.items[index].history.length > 0) {
                appData.items[index].history[appData.items[index].history.length - 1].date_completed = lastCompletedDate;
            } else {
                appData.items[index].history = [{ date_completed: lastCompletedDate, notes: "Added via edit" }];
            }
            appData.items[index].next_due = calculateNextDue(lastCompletedDate, frequency);
        }
    } else {
        const newItem = {
            id: 'item-' + Date.now(), name: name, location: location, category: category,
            frequency_months: frequency, next_due: calculateNextDue(lastCompletedDate, frequency),
            history: [{ date_completed: lastCompletedDate, notes: "Initial entry" }]
        };
        appData.items.push(newItem);
    }

    window.closeModal('itemModal');
    renderDashboard();
    await saveToGitHub(); 
});

// Handle Mark Complete Submission
document.getElementById('logForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('logItemId').value;
    const dateCompleted = document.getElementById('logDate').value;
    const itemIndex = appData.items.findIndex(i => i.id === id);
    
    if (itemIndex > -1) {
        appData.items[itemIndex].history.push({
            date_completed: dateCompleted, notes: document.getElementById('logNotes').value
        });
        appData.items[itemIndex].next_due = calculateNextDue(dateCompleted, appData.items[itemIndex].frequency_months);
        
        window.closeModal('logModal');
        renderDashboard();
        await saveToGitHub(); 
    }
});

// Boot up the app
loadData();
