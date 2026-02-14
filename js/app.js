window.appData = { items: [] };
window.fileSha = ""; 

// --- TAB NAVIGATION ---
window.switchTab = function(tabId, element) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Remove active class from all sidebar buttons
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabId).classList.add('active');
    // Highlight clicked button
    element.classList.add('active');
};

// --- MODAL CONTROLLERS ---
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = "none"; };

window.openSettingsModal = function() {
    document.getElementById('settingsModal').style.display = "block";
};

window.openAddModal = function() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = ""; 
    document.getElementById('modalTitle').innerText = "Add New Task";
    document.getElementById('lastCompletedContainer').style.display = "block"; 
    document.getElementById('itemLastCompleted').value = ""; 
    document.getElementById('deleteBtn').style.display = "none"; // Hide delete button for new tasks
    document.getElementById('itemModal').style.display = "block";
};

window.openEditModal = function(id) {
    const item = window.appData.items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('itemForm').reset();
    document.getElementById('modalTitle').innerText = "Edit Task";
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemLocation').value = item.location;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemFrequency').value = item.frequency_months;
    document.getElementById('lastCompletedContainer').style.display = "block";
    document.getElementById('deleteBtn').style.display = "block"; // Show delete button
    
    if (item.history && item.history.length > 0) {
        document.getElementById('itemLastCompleted').value = item.history[item.history.length - 1].date_completed;
    } else {
        document.getElementById('itemLastCompleted').value = ""; 
    }
    document.getElementById('itemModal').style.display = "block";
};

window.openLogModal = function(id) {
    const item = window.appData.items.find(i => i.id === id);
    if (!item) return; 
    document.getElementById('logForm').reset();
    document.getElementById('logItemId').value = item.id;
    document.getElementById('logItemName').innerText = `Task: ${item.name} (${item.location})`;
    document.getElementById('logDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('logModal').style.display = "block";
};

// --- DATA HELPERS ---
window.calculateNextDue = function(dateString, monthsToAdd) {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + parseInt(monthsToAdd));
    return date.toISOString().split('T')[0];
};

window.showStatusMsg = function(msg, color="green") {
    const el = document.getElementById('status-message');
    el.innerText = msg;
    el.style.color = color;
    setTimeout(() => el.innerText = "", 3000);
};

// --- DELETE ITEM LOGIC ---
window.deleteItem = async function() {
    const id = document.getElementById('itemId').value;
    if (!id) return;
    
    // Safety check pop-up
    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) {
        return; 
    }
    
    // Filter it out of the array
    window.appData.items = window.appData.items.filter(item => item.id !== id);
    
    window.closeModal('itemModal');
    window.renderAllViews();
    await window.saveToGitHub();
};

// --- DATA FETCHING (Github + Local JSONs) ---
async function fetchDropdowns() {
    try {
        const response = await fetch('./dropdowns/locations.json');
        const locations = await response.json();
        const selectEl = document.getElementById('itemLocation');
        
        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.innerText = loc;
            selectEl.appendChild(opt);
        });
    } catch (e) {
        console.error("Could not load locations.json", e);
    }
}

window.saveToGitHub = async function() {
    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');

    if (!user || !repo || !token) {
        window.showStatusMsg("⚠️ Saved locally, but not to GitHub. Please check Settings.", "orange");
        return;
    }

    window.showStatusMsg("⏳ Saving to GitHub...", "blue");

    try {
        const jsonString = JSON.stringify(window.appData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));
        
        const url = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Updated via App", content: base64Content, sha: window.fileSha })
        });

        if (!response.ok) throw new Error("API Save Failed");
        const result = await response.json();
        window.fileSha = result.content.sha; 
        window.showStatusMsg("✅ Saved to GitHub!");
    } catch (error) {
        window.showStatusMsg("❌ Error saving. Check settings.", "red");
    }
};

async function loadData() {
    document.getElementById('ghUser').value = localStorage.getItem('ghUser') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('ghRepo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('ghToken') || '';

    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');

    try {
        let response;
        if (user && repo && token) {
            const url = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
            response = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
            
            if (!response.ok) throw new Error("Could not connect to Repo.");
            const result = await response.json();
            window.fileSha = result.sha; 
            const jsonString = decodeURIComponent(escape(atob(result.content)));
            window.appData = JSON.parse(jsonString);
        } else {
            response = await fetch('./data.json');
            window.appData = await response.json();
        }
        
        // Render both tabs
        if(window.renderAllViews) window.renderAllViews(); 
        
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    }
}

// --- FORM SUBMISSIONS ---
document.getElementById('settingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    localStorage.setItem('ghUser', document.getElementById('ghUser').value.trim());
    localStorage.setItem('ghRepo', document.getElementById('ghRepo').value.trim());
    localStorage.setItem('ghToken', document.getElementById('ghToken').value.trim());
    window.closeModal('settingsModal');
    window.showStatusMsg("⏳ Loading data...", "blue");
    loadData(); 
});

document.getElementById('itemForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const idToEdit = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const location = document.getElementById('itemLocation').value;
    const category = document.getElementById('itemCategory').value;
    const frequency = parseInt(document.getElementById('itemFrequency').value);
    const lastCompletedDate = document.getElementById('itemLastCompleted').value;

    if (idToEdit) {
        const index = window.appData.items.findIndex(i => i.id === idToEdit);
        if (index > -1) {
            window.appData.items[index].name = name;
            window.appData.items[index].location = location;
            window.appData.items[index].category = category;
            window.appData.items[index].frequency_months = frequency;
            
            if (lastCompletedDate) {
                if (window.appData.items[index].history && window.appData.items[index].history.length > 0) {
                    window.appData.items[index].history[window.appData.items[index].history.length - 1].date_completed = lastCompletedDate;
                } else {
                    window.appData.items[index].history = [{ date_completed: lastCompletedDate, notes: "Added via edit" }];
                }
                window.appData.items[index].next_due = window.calculateNextDue(lastCompletedDate, frequency);
            } else {
                window.appData.items[index].history = [];
                window.appData.items[index].next_due = new Date().toISOString().split('T')[0];
            }
        }
    } else {
        const historyArray = lastCompletedDate ? [{ date_completed: lastCompletedDate, notes: "Initial entry" }] : [];
        const nextDue = lastCompletedDate ? window.calculateNextDue(lastCompletedDate, frequency) : new Date().toISOString().split('T')[0];
        const newItem = {
            id: 'item-' + Date.now(), name: name, location: location, category: category,
            frequency_months: frequency, next_due: nextDue, history: historyArray
        };
        window.appData.items.push(newItem);
    }

    window.closeModal('itemModal');
    window.renderAllViews();
    await window.saveToGitHub(); 
});

document.getElementById('logForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('logItemId').value;
    const dateCompleted = document.getElementById('logDate').value;
    const itemIndex = window.appData.items.findIndex(i => i.id === id);
    
    if (itemIndex > -1) {
        window.appData.items[itemIndex].history.push({
            date_completed: dateCompleted, notes: document.getElementById('logNotes').value
        });
        window.appData.items[itemIndex].next_due = window.calculateNextDue(dateCompleted, window.appData.items[itemIndex].frequency_months);
        
        window.closeModal('logModal');
        window.renderAllViews();
        await window.saveToGitHub(); 
    }
});

// Boot up
fetchDropdowns();
loadData();
