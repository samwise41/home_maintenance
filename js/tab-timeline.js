window.initTimeline = function() {
    document.getElementById('tab-timeline').innerHTML = `
        <div class="header">
            <h2>By Due Date</h2>
            <div class="header-actions">
                <input type="text" id="search-timeline" class="search-input" placeholder="🔍 Search tasks..." oninput="window.renderTimeline()">
                <button class="btn-primary" onclick="window.openAddModal()">+ Add New Item</button>
            </div>
        </div>
        <div id="timeline-list"><p>Loading tasks...</p></div>
    `;
};

window.toggleTimelineCard = function(id) {
    const details = document.getElementById('details-' + id);
    const chevron = document.getElementById('chevron-' + id);
    if (details.style.display === 'none') {
        details.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
    } else {
        details.style.display = 'none';
        chevron.style.transform = 'rotate(0deg)';
    }
};

window.renderTimeline = function() {
    const container = document.getElementById('timeline-list');
    if (!container) return; 
    container.innerHTML = '';
    
    // Grab search query
    const query = document.getElementById('search-timeline') ? document.getElementById('search-timeline').value.toLowerCase() : '';
    
    const groups = {
        overdue: { title: "🚨 Overdue", items: [] },
        thisMonth: { title: "📅 Due within 30 days", items: [] },
        nextMonth: { title: "🗓️ Due in 31-60 days", items: [] },
        future: { title: "🔮 Future Tasks", items: [] }
    };

    const today = new Date();
    today.setHours(0,0,0,0);

    // Filter list based on search bar
    const filteredItems = window.appData.items.filter(item => {
        if (!query) return true;
        return (item.name || '').toLowerCase().includes(query) || 
               (item.location || '').toLowerCase().includes(query) || 
               (item.category || '').toLowerCase().includes(query);
    });

    const sortedItems = [...filteredItems].sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

    sortedItems.forEach(item => {
        const nextDue = new Date(item.next_due);
        const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)); 
        if (diffDays < 0) groups.overdue.items.push(item);
        else if (diffDays <= 30) groups.thisMonth.items.push(item);
        else if (diffDays <= 60) groups.nextMonth.items.push(item);
        else groups.future.items.push(item);
    });

    for (const key in groups) {
        const group = groups[key];
        if (group.items.length === 0) continue; 

        const groupHTML = document.createElement('div');
        groupHTML.style.marginBottom = "25px";
        
        let html = `<h3 style="border-bottom: 2px solid #e0e0e0; padding-bottom: 5px; color: var(--text-main); margin-bottom: 10px;">${group.title}</h3>`;
        html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        
        group.items.forEach(item => {
            const formattedDate = window.formatDate(item.next_due);
            const status = window.getStatus(item.next_due);
            const displayLocation = item.location ? item.location : "Location not specified";
            const displayCategory = item.category ? item.category : "Other";
            
            let borderColor = 'var(--primary-btn)'; 
            if (status.class === 'status-overdue') borderColor = 'var(--danger)'; 
            if (status.class === 'status-soon') borderColor = 'var(--warning)'; 
            
            html += `
                <div style="background: white; border-radius: 6px; border-left: 6px solid ${borderColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
                    <div onclick="window.toggleTimelineCard('${item.id}')" style="padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div id="chevron-${item.id}" style="transition: transform 0.3s; font-size: 0.8em; color: var(--text-light);">▼</div>
                            <div>
                                <div style="font-weight: bold; color: var(--text-main);">${item.name}</div>
                                <div style="font-size: 0.85em; color: var(--text-light); margin-top: 2px;">📍 ${displayLocation} - ${displayCategory}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.85em; font-weight: bold; color: var(--text-main);">${formattedDate}</div>
                        </div>
                    </div>
                    <div id="details-${item.id}" style="display: none; padding: 15px; border-top: 1px solid #eee; background-color: #fafafa;">
                        <p style="margin: 0 0 10px 0; font-size: 0.9em; color: var(--text-light);">⏱️ Every ${item.frequency_months} months</p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="badge ${status.class}">${status.text}</span>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn-outline btn-sm" onclick="window.openEditModal('${item.id}')">✏️ Edit</button>
                                <button class="btn-primary btn-sm" onclick="window.openLogModal('${item.id}')">✅ Log Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        groupHTML.innerHTML = html;
        container.appendChild(groupHTML);
    }
    if (sortedItems.length === 0) container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No tasks found.</p>';
};
