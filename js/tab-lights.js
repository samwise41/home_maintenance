window.initLights = function() {
    document.getElementById('tab-lights').innerHTML = `
        <div class="header">
            <h2>💡 Lighting & Fixtures</h2>
            <button class="btn-primary" onclick="window.openFixtureModal()">+ Add New Fixture</button>
        </div>
        <div id="lights-list"><p>Loading fixtures...</p></div>
    `;

    // Handle Fixture Form Submission (Add or Edit)
    document.getElementById('fixtureForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fixtureId = document.getElementById('fixtureId').value;
        const fixtureName = document.getElementById('fixtureName').value;
        const fixtureLocation = document.getElementById('fixtureLocation').value;
        
        // Grab existing fixture if editing so we don't lose bulb history
        let existingFixture = null;
        if(fixtureId) {
            existingFixture = window.lightsData.fixtures.find(f => f.id === fixtureId);
        }

        // Gather dynamic bulbs
        const bulbRows = document.querySelectorAll('.bulb-row');
        const bulbs = [];
        
        bulbRows.forEach((row, index) => {
            const idInput = row.querySelector('.bulb-id-input').value;
            const posInput = row.querySelector('.bulb-pos-input').value.trim();
            const typeInput = row.querySelector('.bulb-type-input').value.trim();
            
            if(posInput !== "" && typeInput !== "") {
                let history = [];
                let newBulbId = idInput;
                
                // If editing an existing bulb, copy over its old history
                if(existingFixture && idInput) {
                    const existingBulb = existingFixture.bulbs.find(b => b.id === idInput);
                    if(existingBulb) {
                        history = existingBulb.history;
                    }
                } else {
                    // It's a brand new bulb slot added to the fixture
                    newBulbId = 'bulb-' + Date.now() + '-' + index;
                }
                
                bulbs.push({
                    id: newBulbId,
                    position: posInput,
                    bulb_type: typeInput,
                    history: history
                });
            }
        });

        if (fixtureId && existingFixture) {
            // Update existing
            existingFixture.name = fixtureName;
            existingFixture.location = fixtureLocation;
            existingFixture.bulbs = bulbs;
        } else {
            // Create new
            const newFixture = {
                id: 'fixture-' + Date.now(),
                name: fixtureName,
                location: fixtureLocation,
                bulbs: bulbs
            };
            window.lightsData.fixtures.push(newFixture);
        }

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
    document.getElementById('fixtureId').value = "";
    document.getElementById('fixtureModalTitle').innerText = "Add New Fixture";
    document.getElementById('deleteFixtureBtn').style.display = "none";
    document.getElementById('bulbInputsContainer').innerHTML = ''; 
    
    window.populateLocationDropdown();
    window.addBulbInput(); // Add one blank slot by default
    document.getElementById('fixtureModal').style.display = "block";
};

window.openEditFixtureModal = function(id) {
    const fixture = window.lightsData.fixtures.find(f => f.id === id);
    if (!fixture) return;

    document.getElementById('fixtureForm').reset();
    document.getElementById('fixtureId').value = fixture.id;
    document.getElementById('fixtureModalTitle').innerText = "Edit Fixture";
    document.getElementById('fixtureName').value = fixture.name;
    document.getElementById('deleteFixtureBtn').style.display = "block";
    
    window.populateLocationDropdown();
    const locSelect = document.getElementById('fixtureLocation');
    // Handle legacy locations not in dropdown
    if (fixture.location && !window.appLocations.includes(fixture.location)) {
        const opt = document.createElement('option');
        opt.value = fixture.location;
        opt.innerText = fixture.location + " (Legacy)";
        locSelect.appendChild(opt);
    }
    locSelect.value = fixture.location || "";

    // Populate bulbs
    document.getElementById('bulbInputsContainer').innerHTML = ''; 
    fixture.bulbs.forEach(bulb => {
        window.addBulbInput(bulb.position, bulb.bulb_type, bulb.id);
    });

    document.getElementById('fixtureModal').style.display = "block";
};

window.deleteFixture = async function() {
    const id = document.getElementById('fixtureId').value;
    if (!id) return;
    if (!confirm("Are you sure you want to delete this fixture? All bulb history will be lost.")) return; 
    
    window.lightsData.fixtures = window.lightsData.fixtures.filter(f => f.id !== id);
    window.closeModal('fixtureModal');
    window.renderLights();
    await window.saveLightsToGitHub();
};

window.addBulbInput = function(pos = "", type = "", id = "") {
    const container = document.getElementById('bulbInputsContainer');
    const inputDiv = document.createElement('div');
    inputDiv.className = 'bulb-row';
    inputDiv.style.display = "flex";
    inputDiv.style.gap = "8px";
    inputDiv.style.marginBottom = "5px";
    
    // Inject two inputs per row (position and type), plus a hidden ID field so we don't lose history on edit
    inputDiv.innerHTML = `
        <input type="hidden" class="bulb-id-input" value="${id}">
        <input type="text" class="bulb-pos-input" placeholder="Position (e.g., North)" style="flex: 1;" value="${pos}" required>
        <input type="text" class="bulb-type-input" placeholder="Type (e.g., A19 60W)" style="flex: 1;" value="${type}" required>
        <button type="button" class="btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>
    `;
    
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
                            <div style="font-size: 0.85em; color: var(--text-light);">Type: <strong>${bulb.bulb_type || 'Unknown'}</strong> | ${lastReplacedTxt}</div>
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
            <div class="card-header" style="border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3 style="margin: 0; color: var(--text-main);">${fixture.name}</h3>
                    <div style="font-size: 0.85em; color: var(--text-light); margin-top: 4px;">📍 ${fixture.location}</div>
                </div>
                <button class="btn-outline btn-sm" onclick="window.openEditFixtureModal('${fixture.id}')">✏️ Edit</button>
            </div>
            <div>
                ${bulbHtml}
            </div>
        `;
        container.appendChild(card);
    });
};
