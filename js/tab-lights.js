window.initLights = function() {
    document.getElementById('tab-lights').innerHTML = `
        <div class="header">
            <h2>💡 Lighting & Fixtures</h2>
            <button class="btn-primary" onclick="window.openFixtureModal()">+ Add New Fixture</button>
        </div>
        <div id="lights-list"><p>Loading fixtures...</p></div>
    `;

    // Handle Fixture Form Submission
    document.getElementById('fixtureForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fixtureName = document.getElementById('fixtureName').value;
        const fixtureLocation = document.getElementById('fixtureLocation').value;
        const fixtureBulbType = document.getElementById('fixtureBulbType').value;
        
        // Gather dynamic bulbs
        const bulbInputs = document.querySelectorAll('.bulb-slot-input');
        const bulbs = [];
        bulbInputs.forEach((input, index) => {
            if(input.value.trim() !== "") {
                bulbs.push({
                    id: 'bulb-' + Date.now() + '-' + index,
                    position: input.value.trim(),
                    history: []
                });
            }
        });

        const newFixture = {
            id: 'fixture-' + Date.now(),
            name: fixtureName,
            location: fixtureLocation,
            default_bulb_type: fixtureBulbType,
            bulbs: bulbs
        };

        window.lightsData.fixtures.push(newFixture);
        window.closeModal('fixtureModal');
        window.renderLights();
        await window.saveLightsToGitHub();
    });

    // Handle Bulb Log Form Submission
    document.getElementById('bulbLogForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fixId = document.getElementById('bulbLogFixtureId').value;
        const bulbId = document.getElementById('bulbLogBulbId').value;
        const logDate = document.getElementById('bulbLogDate').value;
        const logCost = parseFloat(document.getElementById('bulbLogCost').value) || 0;
        const logNotes = document.getElementById('bulbLogNotes').value;

        const fixture = window.lightsData.fixtures.find(f => f.id === fixId);
        if(fixture) {
            const bulb = fixture.bulbs.find(b => b.id === bulbId);
            if(bulb) {
                bulb.history.push({
                    date_replaced: logDate,
                    cost: logCost,
                    notes: logNotes
                });
                // Sort history newest first
                bulb.history.sort((a, b) => new Date(b.date_replaced) - new Date(a.date_replaced));
            }
        }

        window.closeModal('bulbLogModal');
        window.renderLights();
        await window.saveLightsToGitHub();
    });
};

// UI Controllers for the Form
window.openFixtureModal = function() {
    document.getElementById('fixtureForm').reset();
    document.getElementById('bulbInputsContainer').innerHTML = ''; // clear slots
    window.populateLocationDropdown();
    window.addBulbInput('Bulb 1'); // Add one default slot
    document.getElementById('fixtureModal').style.display = "block";
};

window.addBulbInput = function(placeholder = "e.g., North Bulb, Middle, Left") {
    const container = document.getElementById('bulbInputsContainer');
    const inputDiv = document.createElement('div');
    inputDiv.style.display = "flex";
    inputDiv.style.gap = "10px";
    
    const input = document.createElement('input');
    input.type = "text";
    input.className = "bulb-slot-input";
    input.placeholder = placeholder;
    input.required = true;

    const delBtn = document.createElement('button');
    delBtn.type = "button";
    delBtn.className = "btn-danger btn-sm";
    delBtn.innerText = "X";
    delBtn.onclick = function() { container.removeChild(inputDiv); };

    inputDiv.appendChild(input);
    inputDiv.appendChild(delBtn);
    container.appendChild(inputDiv);
};

window.openBulbLogModal = function(fixtureId, bulbId, bulbName, fixtureName) {
    document.getElementById('bulbLogForm').reset();
    document.getElementById('bulbLogFixtureId').value = fixtureId;
    document.getElementById('bulbLogBulbId').value = bulbId;
    document.getElementById('bulbLogName').innerText = `${fixtureName} - ${bulbName}`;
    document.getElementById('bulbLogDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('bulbLogModal').style.display = "block";
};

window.toggleBulbHistory = function(bulbId) {
    const el = document.getElementById('bulb-hist-' + bulbId);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

window.renderLights = function() {
    const container = document.getElementById('lights-list');
    if (!container) return;
    container.innerHTML = '';

    if (!window.lightsData || !window.lightsData.fixtures || window.lightsData.fixtures.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No fixtures found. Click Add New Fixture to get started.</p>';
        return;
    }

    // Sort fixtures alphabetically by location then name
    const sortedFixtures = [...window.lightsData.fixtures].sort((a, b) => {
        if(a.location === b.location) return a.name.localeCompare(b.name);
        return a.location.localeCompare(b.location);
    });

    sortedFixtures.forEach(fixture => {
        let bulbHtml = '';
        
        fixture.bulbs.forEach(bulb => {
            let lastReplacedTxt = "Never replaced";
            let historyHtml = '<p style="font-size: 0.8em; color: #888; font-style: italic;">No history yet.</p>';
            
            if (bulb.history && bulb.history.length > 0) {
                lastReplacedTxt = `Replaced: ${window.formatDate(bulb.history[0].date_replaced)}`;
                historyHtml = bulb.history.map(h => 
                    `<div style="font-size: 0.85em; border-bottom: 1px dashed #ddd; padding: 4px 0;">
                        <strong>${window.formatDate(h.date_replaced)}</strong> 
                        ${h.cost > 0 ? `($${h.cost})` : ''} 
                        ${h.notes ? `- ${h.notes}` : ''}
                    </div>`
                ).join('');
            }

            bulbHtml += `
                <div style="background: #fdfdfd; border: 1px solid #eee; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: var(--text-main); font-size: 0.95em;">💡 ${bulb.position}</div>
                            <div style="font-size: 0.85em; color: var(--text-light);">${lastReplacedTxt}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-outline btn-sm" onclick="window.toggleBulbHistory('${bulb.id}')">🕒 History</button>
                            <button class="btn-primary btn-sm" onclick="window.openBulbLogModal('${fixture.id}', '${bulb.id}', '${bulb.position}', '${fixture.name}')">🔌 Replace</button>
                        </div>
                    </div>
                    <div id="bulb-hist-${bulb.id}" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                        ${historyHtml}
                    </div>
                </div>
            `;
        });

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="card-header" style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0; color: var(--text-main);">${fixture.name}</h3>
                    <div style="font-size: 0.85em; color: var(--text-light); margin-top: 4px;">📍 ${fixture.location} | Type: <strong>${fixture.default_bulb_type}</strong></div>
                </div>
            </div>
            <div>
                ${bulbHtml}
            </div>
        `;
        container.appendChild(card);
    });
};
