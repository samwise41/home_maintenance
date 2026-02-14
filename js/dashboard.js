// Helper for card colors
function getStatus(nextDueDateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextDue = new Date(nextDueDateStr);
    const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)); 
    
    // Status Logic
    if (diffDays < 0) return { class: 'status-overdue', text: '🚨 Overdue' };
    if (diffDays <= 30) return { class: 'status-soon', text: '⚠️ Due Soon' };
    return { class: 'status-ok', text: '✅ OK' };
}

window.renderAllViews = function() {
    const dashList = document.getElementById('dashboard-list');
    const allList = document.getElementById('all-tasks-list');
    
    dashList.innerHTML = ''; 
    allList.innerHTML = ''; 
    
    let dashboardCount = 0;

    // Sort array by due date
    window.appData.items.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    window.appData.items.forEach(item => {
        const status = getStatus(item.next_due);
        const dateObj = new Date(item.next_due);
        const adjustedDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
        const formattedDate = adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Build the HTML for a single card
        const cardHTML = `
            <div class="card-header">
                <h3>${item.name}</h3>
                <button class="btn-primary btn-sm" onclick="window.openLogModal('${item.id}')">✅ Log Done</button>
            </div>
            
            <div class="card-body">
                <p>📍 ${item.location} | ⏱️ Every ${item.frequency_months} months</p>
                <p><strong>Next Due:</strong> ${formattedDate}</p>
            </div>
            
            <div class="card-footer">
                <span class="badge ${status.class}">${status.text}</span>
                <button class="btn-outline" onclick="window.openEditModal('${item.id}')">✏️ Edit</button>
            </div>
        `;

        // 1. Add to "All Tasks" Tab
        const cardAll = document.createElement('div');
        cardAll.className = 'item-card';
        cardAll.innerHTML = cardHTML;
        allList.appendChild(cardAll);

        // 2. Add to "Dashboard" Tab ONLY if it requires action (Overdue or Due Soon)
        if (status.class === 'status-overdue' || status.class === 'status-soon') {
            const cardDash = document.createElement('div');
            cardDash.className = 'item-card';
            cardDash.innerHTML = cardHTML;
            dashList.appendChild(cardDash);
            dashboardCount++;
        }
    });

    // Empty State Messages
    if (dashboardCount === 0) {
        dashList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-light); background: white; border-radius: 8px;">
                <h3 style="margin-bottom: 5px;">🎉 All Caught Up!</h3>
                <p>You have zero tasks due in the next 30 days.</p>
            </div>`;
    }
    
    if (window.appData.items.length === 0) {
        allList.innerHTML = '<p style="text-align: center; color: var(--text-light);">No tasks yet. Click Add New Item to get started.</p>';
    }
};
