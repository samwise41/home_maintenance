window.renderAllTasks = function() {
    const allList = document.getElementById('all-tasks-list');
    allList.innerHTML = ''; 

    window.appData.items.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    window.appData.items.forEach(item => {
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

    if (window.appData.items.length === 0) {
        allList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No tasks yet. Click Add New Item to get started.</p>';
    }
};
