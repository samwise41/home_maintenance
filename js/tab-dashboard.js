// Holds our chart objects so we can destroy them before re-drawing to prevent visual glitches
window.chartInstances = {};

window.renderDashboard = function() {
    const dashList = document.getElementById('dashboard-list');
    if (!dashList) return;
    dashList.innerHTML = ''; 
    let dashboardCount = 0;

    // 1. DYNAMIC LIST: Render Action Required Cards
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

    // 2. ANALYTICS: Render Chart.js
    renderAnalytics();
};

function renderAnalytics() {
    const items = window.appData.items;

    // --- CHART 1: House Health (Doughnut) ---
    let overdue = 0, soon = 0, ok = 0;
    items.forEach(i => {
        const st = window.getStatus(i.next_due).class;
        if(st === 'status-overdue') overdue++;
        else if(st === 'status-soon') soon++;
        else ok++;
    });

    renderChart('chartHealth', 'doughnut', {
        labels: ['Overdue', 'Due Soon', 'Good Standing'],
        datasets: [{
            data: [overdue, soon, ok],
            backgroundColor: ['#dc3545', '#ffc107', '#28a745'] // Red, Yellow, Green
        }]
    });


    // --- CHART 2: Workload by Category (Pie) ---
    const catCounts = {};
    items.forEach(i => {
        const c = i.category || 'Other';
        catCounts[c] = (catCounts[c] || 0) + 1;
    });
    
    const pieColors = ['#007bff', '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#17a2b8', '#6c757d', '#28a745', '#ffc107', '#dc3545'];

    renderChart('chartCategory', 'pie', {
        labels: Object.keys(catCounts),
        datasets: [{
            data: Object.values(catCounts),
            backgroundColor: pieColors.slice(0, Object.keys(catCounts).length)
        }]
    });


    // --- DATA HELPER: Generate Month Labels ---
    const getMonthKey = (date) => {
        const d = new Date(date);
        const adjustedDate = new Date(d.getTime() + (d.getTimezoneOffset() * 60000));
        return `${adjustedDate.getFullYear()}-${String(adjustedDate.getMonth()+1).padStart(2, '0')}`;
    };
    
    const formatMonthKey = (key) => {
        const [y, m] = key.split('-');
        const d = new Date(y, parseInt(m)-1);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    // Generate keys for the Past 6 Months and Next 6 Months
    const past6Keys = [];
    for(let i=5; i>=0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        past6Keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`);
    }

    const next6Keys = [];
    for(let i=0; i<=5; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        next6Keys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`);
    }


    // --- CHART 3: Maintenance Forecast (Bar) ---
    const forecastCounts = {};
    next6Keys.forEach(k => forecastCounts[k] = 0);
    items.forEach(i => {
        const k = getMonthKey(i.next_due);
        if(forecastCounts[k] !== undefined) forecastCounts[k]++;
    });

    renderChart('chartForecast', 'bar', {
        labels: next6Keys.map(formatMonthKey),
        datasets: [{
            label: 'Tasks Due',
            data: next6Keys.map(k => forecastCounts[k]),
            backgroundColor: '#007bff'
        }]
    });


    // --- CHART 4 & 5: Completed Tasks & Expenses ---
    const completedCounts = {};
    const expenses = {};
    past6Keys.forEach(k => { completedCounts[k] = 0; expenses[k] = 0; });

    // Look at the history of every item to sum up past behavior
    items.forEach(i => {
        if(i.history) {
            i.history.forEach(h => {
                const k = getMonthKey(h.date_completed);
                if(completedCounts[k] !== undefined) {
                    completedCounts[k]++;
                    expenses[k] += parseFloat(h.cost) || 0;
                }
            });
        }
    });

    renderChart('chartCompleted', 'line', {
        labels: past6Keys.map(formatMonthKey),
        datasets: [{
            label: 'Tasks Completed',
            data: past6Keys.map(k => completedCounts[k]),
            borderColor: '#28a745',
            tension: 0.1,
            fill: false
        }]
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });

    renderChart('chartExpenses', 'bar', {
        labels: past6Keys.map(formatMonthKey),
        datasets: [{
            label: 'Money Spent ($)',
            data: past6Keys.map(k => expenses[k]),
            backgroundColor: '#dc3545'
        }]
    });
}

// Global Reusable function to draw a Chart.js Canvas
function renderChart(id, type, data, options = {}) {
    if(window.chartInstances[id]) {
        window.chartInstances[id].destroy(); // Destroy old chart instance to prevent errors
    }
    const ctx = document.getElementById(id);
    if(!ctx) return;
    window.chartInstances[id] = new Chart(ctx, { 
        type: type, 
        data: data, 
        options: { ...options, responsive: true, maintainAspectRatio: false } 
    });
}
