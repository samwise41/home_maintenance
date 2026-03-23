window.initNest = function() {
    document.getElementById('tab-nest').innerHTML = `
        <div class="header">
            <h2>🌡️ Home Temperature History</h2>
            <div class="header-actions">
                <button class="btn-outline" onclick="window.renderNest()">🔄 Refresh</button>
            </div>
        </div>
        <div class="chart-card" style="height: 500px; max-height: 70vh;">
            <h3>Temperature Trends</h3>
            <div class="chart-container">
                <canvas id="chartNest"></canvas>
            </div>
        </div>
    `;
};

window.renderNest = function() {
    const container = document.getElementById('chartNest');
    if (!container) return;

    if (!window.nestData || !window.nestData.history || window.nestData.history.length === 0) {
        // Just show a placeholder if the GitHub action hasn't run yet
        const ctx = container.getContext('2d');
        ctx.font = "14px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText("Waiting for first temperature data...", container.width / 2, container.height / 2);
        return;
    }

    const history = window.nestData.history;

    // 1. Extract timestamps to use as X-axis labels
    const labels = history.map(entry => {
        // Optional: format the timestamp nicely (e.g. "Mar 23, 2:00 PM")
        const d = new Date(entry.timestamp);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    });

    // 2. Discover all the unique sensor names in the data
    const sensors = new Set();
    history.forEach(entry => {
        if (entry.readings) {
            Object.keys(entry.readings).forEach(k => sensors.add(k));
        }
    });

    // 3. Build a Chart.js dataset for each sensor
    const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6f42c1', '#17a2b8'];
    const datasets = Array.from(sensors).map((sensor, index) => {
        return {
            label: sensor,
            data: history.map(entry => entry.readings ? (entry.readings[sensor] || null) : null),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            tension: 0.3, // Adds a slight curve to the lines
            fill: false,
            pointRadius: 2, // Keep points small
            pointHoverRadius: 5
        };
    });

    // 4. Draw the chart
    if (window.chartInstances && window.chartInstances['chartNest']) {
        window.chartInstances['chartNest'].destroy(); 
    }
    
    // Create the global chartInstances object if it doesn't exist yet
    if(!window.chartInstances) window.chartInstances = {};

    window.chartInstances['chartNest'] = new Chart(container, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: { 
                    title: { display: true, text: 'Temperature (°F)' },
                    // Optional: keep the graph focused tightly on indoor temps
                    suggestedMin: 60, 
                    suggestedMax: 80 
                },
                x: { 
                    title: { display: false, text: 'Time' },
                    ticks: { maxTicksLimit: 12 } // Prevents the x-axis from getting cluttered
                }
            }
        }
    });
};
