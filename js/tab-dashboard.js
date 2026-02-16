window.chartInstances = {};

window.initDashboard = function() {
    document.getElementById('tab-dashboard').innerHTML = `
        <div class="header" style="border-bottom: 2px solid #eee; padding-bottom: 10px;">
            <h2>📊 Dashboard Analytics</h2>
            <button class="btn-primary" onclick="window.openAddModal()">+ Add New Item</button>
        </div>
        <div class="chart-grid">
            <div class="chart-card">
                <h3>House Health</h3>
                <div class="chart-container"><canvas id="chartHealth"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>Workload by Category</h3>
                <div class="chart-container"><canvas id="chartCategory"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>Overdue by Category</h3>
                <div class="chart-container"><canvas id="chartOverdueCategory"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>Maintenance Forecast (6 Mo)</h3>
                <div class="chart-container"><canvas id="chartForecast"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>Completed Tasks (Past 6 Mo)</h3>
                <div class="chart-container"><canvas id="chartCompleted"></canvas></div>
            </div>
            <div class="chart-card">
                <h3>Expenses (Past 6 Mo)</h3>
                <div class="chart-container"><canvas id="chartExpenses"></canvas></div>
            </div>
        </div>
    `;
};

window.renderDashboard = function() {
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
            backgroundColor: ['#dc3545', '#ffc107', '#28a745']
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

    // --- CHART 3: Overdue by Category (Bar) ---
    const overdueCatCounts = {};
    items.forEach(i => {
        if (window.getStatus(i.next_due).class === 'status-overdue') {
            const c = i.category || 'Other';
            overdueCatCounts[c] = (overdueCatCounts[c] || 0) + 1;
        }
    });

    const overdueLabels = Object.keys(overdueCatCounts).length > 0 ? Object.keys(overdueCatCounts) : ['No Overdue Tasks'];
    const overdueData = Object.keys(overdueCatCounts).length > 0 ? Object.values(overdueCatCounts) : [0];

    renderChart('chartOverdueCategory', 'bar', {
        labels: overdueLabels,
        datasets: [{
            label: 'Overdue Tasks',
            data: overdueData,
            backgroundColor: '#dc3545'
        }]
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });

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

    // --- CHART 4: Maintenance Forecast (Bar) ---
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
    }, { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } });

    // --- CHART 5 & 6: Completed Tasks & Expenses ---
    const completedCounts = {};
    const expenses = {};
    past6Keys.forEach(k => { completedCounts[k] = 0; expenses[k] = 0; });

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
            backgroundColor: '#20c997' 
        }]
    });
}

function renderChart(id, type, data, options = {}) {
    if(window.chartInstances[id]) {
        window.chartInstances[id].destroy(); 
    }
    const ctx = document.getElementById(id);
    if(!ctx) return;
    window.chartInstances[id] = new Chart(ctx, { 
        type: type, 
        data: data, 
        options: { ...options, responsive: true, maintainAspectRatio: false } 
    });
}
