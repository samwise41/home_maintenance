window.initAllTasks = function() {
    document.getElementById('tab-all').innerHTML = `
        <div class="header">
            <h2>All Maintenance Tasks</h2>
            <div class="header-actions">
                <input type="text" id="search-tasks" class="search-input" placeholder="🔍 Search tasks..." oninput="window.renderAllTasks()">
                <button class="btn-primary" onclick="window.openAddModal()">+ Add New Item</button>
            </div>
        </div>
        <div id="all-tasks-list"><p>Loading your tasks...</p></div>
    `;
};

window.renderAllTasks = function() {
    const allList = document.getElementById('all-tasks-list');
    if (!allList) return;
    allList.innerHTML = ''; 

    const query = document.getElementById('search-tasks') ? document.getElementById('search-tasks').value.toLowerCase() : '';
    const filteredItems = window.appData.items.filter(item => {
        if (!query) return true;
        return (item.name || '').toLowerCase().includes(query) || 
               (item.location || '').toLowerCase().includes(query) || 
               (item.category || '').toLowerCase().includes(query);
    });

    const sortedItems = [...filteredItems].sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    sortedItems.forEach(item => {
        const status = window.getStatus(item.next_due);
        const formattedDate = window.formatDate(item.next_due);
        const displayLocation = item.location ? item.location : "Location not specified";

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="card-header">
                <h3>${item.name}</h3>
                <button class="btn-primary btn-sm" onclick="window.openLogModal('${item.id}')">✅ Log Done</button>
            </div>
            <div class="card-body">
                <p>📍 ${displayLocation} | ⏱️ Every ${item.frequency_months} months</p>
                <p><strong>Next Due:</strong> ${formattedDate}</p>
            </div>
            <div class="card-footer">
                <span class="badge ${status.class}">${status.text}</span>
                <button class="btn-outline" onclick="window.openEditModal('${item.id}')">✏️ Edit</button>
            </div>
        `;
        allList.appendChild(card);
    });

    if (sortedItems.length === 0) {
        allList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No tasks found.</p>';
    }
};
