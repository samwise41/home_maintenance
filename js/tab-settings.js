window.initSettings = function() {
    document.getElementById('tab-settings').innerHTML = `
        <div class="header"><h2>Settings & Utilities</h2></div>
        <div class="settings-grid">
            <div class="settings-card">
                <h3 style="margin-top: 0;">GitHub Sync</h3>
                <p style="color: var(--text-light); font-size: 0.9em;">Connect your repository to save your data permanently.</p>
                <form id="settingsForm" style="margin-top: 0;">
                    <label>GitHub Username:</label>
                    <input type="text" id="ghUser" required>
                    <label>Repository Name:</label>
                    <input type="text" id="ghRepo" required>
                    <label>Personal Access Token:</label>
                    <input type="password" id="ghToken" required>
                    <button type="submit" class="btn-primary" style="margin-top: 10px;">Save Credentials</button>
                </form>
            </div>
            <div class="settings-card">
                <h3 style="margin-top: 0;">Manage Locations</h3>
                <p style="color: var(--text-light); font-size: 0.9em;">Modify the location options for your tasks.</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="newLocationInput" placeholder="Add location..." style="flex: 1;">
                    <button class="btn-primary btn-sm" onclick="window.addNewLocation()">Add</button>
                </div>
                <div id="locations-manager-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px; padding: 5px;"></div>
            </div>
            <div class="settings-card">
                <h3 style="margin-top: 0;">Manage Categories</h3>
                <p style="color: var(--text-light); font-size: 0.9em;">Modify the category options for your tasks.</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <input type="text" id="newCategoryInput" placeholder="Add category..." style="flex: 1;">
                    <button class="btn-primary btn-sm" onclick="window.addNewCategory()">Add</button>
                </div>
                <div id="categories-manager-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; border-radius: 4px; padding: 5px;"></div>
            </div>
        </div>
    `;

    // Load saved GitHub credentials into the new inputs
    document.getElementById('ghUser').value = localStorage.getItem('ghUser') || '';
    document.getElementById('ghRepo').value = localStorage.getItem('ghRepo') || '';
    document.getElementById('ghToken').value = localStorage.getItem('ghToken') || '';

    // Bind event listener to the newly generated form
    document.getElementById('settingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        localStorage.setItem('ghUser', document.getElementById('ghUser').value.trim());
        localStorage.setItem('ghRepo', document.getElementById('ghRepo').value.trim());
        localStorage.setItem('ghToken', document.getElementById('ghToken').value.trim());
        window.showStatusMsg("⏳ Refreshing connection...", "blue");
        window.loadInitialData(); 
    });
};

window.renderSettings = function() {
    const locList = document.getElementById('locations-manager-list');
    if (!locList) return;
    locList.innerHTML = '';
    window.appLocations.forEach((loc, index) => {
        const div = document.createElement('div');
        div.className = 'location-list-item';
        div.innerHTML = `<span>${loc}</span><button class="btn-danger btn-sm" onclick="window.deleteLocation(${index})">X</button>`;
        locList.appendChild(div);
    });

    const catList = document.getElementById('categories-manager-list');
    if (!catList) return;
    catList.innerHTML = '';
    window.appCategories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'location-list-item';
        div.innerHTML = `<span>${cat}</span><button class="btn-danger btn-sm" onclick="window.deleteCategory(${index})">X</button>`;
        catList.appendChild(div);
    });
};
