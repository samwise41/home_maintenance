window.appData = { items: [] };
window.fileSha = ""; 

window.appLocations = [];
window.locationFileSha = "";

// --- TAB NAVIGATION ---
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
};

// --- MODAL CONTROLLERS ---
window.closeModal = function(modalId) { document.getElementById(modalId).style.display = "none"; };

window.openAddModal = function() {
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = ""; 
    document.getElementById('modalTitle').innerText = "Add New Task";
    document.getElementById('lastCompletedContainer').style.display = "block"; 
    document.getElementById('itemLastCompleted').value = ""; 
    document.getElementById('deleteBtn').style.display = "none"; 
    
    // Refresh dropdown to normal state
    window.populateLocationDropdown();
    
    document.getElementById('itemModal').style.display = "block";
};

window.openEditModal = function(id) {
    const item = window.appData.items.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('itemForm').reset();
    document.getElementById('modalTitle').innerText = "Edit Task";
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemFrequency').value = item.frequency_months;
    document.getElementById('lastCompletedContainer').style.display = "block";
    document.getElementById('deleteBtn').style.display = "block"; 
    
    // Fix for the Null Bug: If the item's location isn't in our array, add it temporarily so it doesn't wipe out
    window.populateLocationDropdown(); 
    const locSelect = document.getElementById('itemLocation');
    if (item.location && !window.appLocations.includes(item.location)) {
        const opt = document.createElement('option');
        opt.value = item.location;
        opt.innerText = item.location + " (Legacy)";
        locSelect.appendChild(opt);
    }
    locSelect.value = item.location || "";
    
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
    document.getElementById('logItemName').innerText = `Task: ${item.name} (${item.location || 'Unknown'})`;
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

window.deleteItem = async function() {
    const id = document.getElementById('itemId').value;
    if (!id) return;
    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) return; 
    
    window.appData.items = window.appData.items.filter(item => item.id !== id);
    window.closeModal('itemModal');
    window.renderAllViews();
    await window.saveToGitHub();
};

// --- LOCATION UTILITIES ---
window.populateLocationDropdown = function() {
    const selectEl = document.getElementById('itemLocation');
    selectEl.innerHTML = '<option value="">Select a location...</option>';
    window.appLocations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.innerText = loc;
        selectEl.appendChild(opt);
    });
};

window.renderLocationManager = function() {
    const list = document.getElementById('locations-manager-list');
    list.innerHTML = '';
    window.appLocations.forEach((loc, index) => {
        const div = document.createElement('div');
        div.className = 'location-list-item';
        div.innerHTML = `
            <span>${loc}</span>
            <button class="btn-danger btn-sm" onclick="window.deleteLocation(${index})">X</button>
        `;
        list.appendChild(div);
    });
};

window.addNewLocation = async function() {
    const input = document.getElementById('newLocationInput');
    const val = input.value.trim();
    if (!val) return;
    
    if (!window.appLocations.includes(val)) {
        window.appLocations.push(val);
        input.value = "";
        window.populateLocationDropdown();
        window.renderLocationManager();
        await window.saveLocationsToGitHub();
    }
};

window.deleteLocation = async function(index) {
    if(confirm("Delete this location option? (Existing tasks won't break, they will just show as 'Legacy').")) {
        window.appLocations.splice(index, 1);
        window.populateLocationDropdown();
        window.renderLocationManager();
        await window.saveLocationsToGitHub();
    }
};

// --- GITHUB SYNC (Data & Locations) ---

window.saveLocationsToGitHub = async function() {
    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');
    if (!user || !repo || !token) return;

    window.showStatusMsg("⏳ Saving Locations to GitHub...", "blue");
    try {
        const jsonString = JSON.stringify(window.appLocations, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));
        const url = `https://api.github.com/repos/${user}/${repo}/contents/dropdowns/locations.json`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Updated Locations via App", content: base64Content, sha: window.locationFileSha })
        });
        if (!response.ok) throw new Error("API Save Failed");
        const result = await response.json();
        window.locationFileSha = result.content.sha; 
        window.showStatusMsg("✅ Locations Saved to GitHub!");
    } catch (error) {
        window.showStatusMsg("❌ Error saving locations.", "red");
    }
};

window.saveToGitHub = async function() {
    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');

    if (!user || !repo || !token) {
        window.showStatusMsg("⚠️ Saved locally. Connect GitHub in Utilities to save permanently.", "orange");
        return;
    }

    window.showStatusMsg("⏳ Saving Data to GitHub...", "blue");
    try {
        const jsonString = JSON.stringify(window.appData, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));
        const url = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Updated Tasks via App", content: base64Content, sha: window.fileSha })
        });
        if (!response.ok) throw new Error("API Save Failed");
        const result = await response.json();
        window.fileSha = result.content.sha; 
        window.showStatusMsg("✅ Data Saved to GitHub!");
    } catch (error) {
        window.showStatusMsg("❌ Error saving data.", "red");
    }
};

async function loadInitialData() {
    document.getElementById('ghUser').value = localStorage.getItem('ghUser') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('ghRepo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('ghToken') || '';

    const user = localStorage.getItem('ghUser');
    const repo = localStorage.getItem('ghRepo');
    const token = localStorage.getItem('ghToken');

    try {
        let dataResponse, locResponse;
        
        if (user && repo && token) {
            // Fetch Data
            const dataUrl = `https://api.github.com/repos/${user}/${repo}/contents/data.json`;
            dataResponse = await fetch(dataUrl, { headers: { 'Authorization': `token ${token}` } });
            if (dataResponse.ok) {
                const dataResult = await dataResponse.json();
                window.fileSha = dataResult.sha; 
                window.appData = JSON.parse(decodeURIComponent(escape(atob(dataResult.content))));
            }
            
            // Fetch Locations
            const locUrl = `https://api.github.com/repos/${user}/${repo}/contents/dropdowns/locations.json`;
            locResponse = await fetch(locUrl, { headers: { 'Authorization': `token ${token}` } });
            if (locResponse.ok) {
                const locResult = await locResponse.json();
                window.locationFileSha = locResult.sha;
                window.appLocations = JSON.parse(decodeURIComponent(escape(atob(locResult.content))));
            }
        } else {
            // Local fallback
            dataResponse = await fetch('./data.json');
            window.appData = await dataResponse.json();
            locResponse = await fetch('./dropdowns/locations.json');
            window.appLocations = await locResponse.json();
        }
        
        window.populateLocationDropdown();
        window.renderLocationManager();
        if(window.renderAllViews) window.renderAllViews(); 
        
    } catch (error) {
        document.getElementById('dashboard-list').innerHTML = `<p style="color:red;">Error loading: ${error.message}</p>`;
    }
}

// --- FORM SUBMISSIONS ---
document.getElementById('settingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    localStorage.setItem('ghUser', document.getElementById('ghUser').value.trim());
    localStorage.setItem('ghRepo', document.getElementById('ghRepo').value.trim());
    localStorage.setItem('ghToken', document.getElementById('ghToken').value.trim());
    window.showStatusMsg("⏳ Refreshing connection...", "blue");
    loadInitialData(); 
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
loadInitialData();
