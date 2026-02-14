// Helper for card colors
function getStatus(nextDueDateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextDue = new Date(nextDueDateStr);
    const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)); 
    if (diffDays < 0) return { class: 'status-overdue', text: '🚨 Overdue' };
    if (diffDays <= 30) return { class: 'status-soon', text: '⚠️ Due Soon' };
    return { class: 'status-ok', text: '✅ OK' };
}

window.renderDashboard = function() {
    const listContainer = document.getElementById('dashboard-list');
    listContainer.innerHTML = ''; 
    
    // Sort array by due date
    window.appData.items.sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    window.appData.items.forEach(item => {
        const status = getStatus(item.next_due);
        const dateObj = new Date(item.next_due);
        const adjustedDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
        const formattedDate = adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const card = document.createElement('div');
        card.className = 'item-card';
        
        // Redesigned Card Layout with small button top-right
        card.innerHTML = `
            <div class="card-header">
                <h3>${item.name}</h3>
                <button class="btn-primary btn-sm" onclick="window.openLogModal('${item.id}')">✅ Done</button>
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
        listContainer.appendChild(card);
    });
};
