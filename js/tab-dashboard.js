window.renderDashboard = function() {
    const dashList = document.getElementById('dashboard-list');
    dashList.innerHTML = ''; 
    let dashboardCount = 0;

    window.appData.items.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    window.appData.items.forEach(item => {
        const status = window.getStatus(item.next_due);
        if (status.class === 'status-overdue' || status.class === 'status-soon') {
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
            dashList.appendChild(card);
            dashboardCount++;
        }
    });

    if (dashboardCount === 0) {
        dashList.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: var(--text-light); background: white; border-radius: 8px;"><h3 style="margin-bottom: 5px;">🎉 All Caught Up!</h3><p>You have zero tasks due in the next 30 days.</p></div>`;
    }
};
