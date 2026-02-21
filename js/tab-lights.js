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
        
        let existingFixture = null;
        if(fixtureId) existingFixture = window.lightsData.fixtures.find(f => f.id === fixtureId);

        // Gather dynamic bulbs
        const bulbRows = document.querySelectorAll('.bulb-row');
        const bulbs = [];
        
        bulbRows.forEach((row, index) => {
            const idInput = row.querySelector('.bulb-id-input').value;
            const posInput = row.querySelector('.bulb-pos-input').value.trim();
            
            if(posInput !== "") {
                let history = [];
                let newBulbId = idInput;
                
                if(existingFixture && idInput) {
                    const existingBulb = existingFixture.bulbs.find(b => b.id === idInput);
                    if(existingBulb) history = existingBulb.history;
                } else {
                    newBulbId = 'bulb-' + Date.now() + '-' + index;
                }
                
                bulbs.push({
                    id: newBulbId,
                    position: posInput,
                    history: history
                });
            }
        });

        if (fixtureId && existingFixture) {
            existingFixture.name = fixtureName;
            existingFixture.location = fixtureLocation;
            existingFixture.bulbs = bulbs;
        } else {
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
        
        const logBrand = document.getElementById('bulbLogBrand').value.trim();
        const logBulbName = document.getElementById('bulbLogBulbName').value.trim();
        const logWattage = document.getElementById('bulbLogWattage').value.trim();
        const logColor = document.getElementById('bulbLogColor').value.trim();
        
        const logCost = parseFloat(document.getElementById('bulbLogCost').value) || 0;
        const logNotes = document.getElementById('bulbLogNotes').value;

        const fixture = window.lightsData.fixtures.find(f => f.id === fixId);
        if(fixture) {
            const bulb = fixture.bulbs.find(b => b.id === bulbId);
            if(bulb) {
                bulb.history.push({
                    date_replaced: logDate,
                    brand: logBrand,
                    bulb_name: logBulbName,
                    wattage: logWattage,
                    color: logColor,
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
    window.addBulbInput(); 
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
    if (fixture.location && !window.appLocations.includes(fixture.location)) {
        const opt = document.createElement('option');
        opt.value = fixture.location;
        opt.innerText = fixture.location + " (Legacy)";
        locSelect.appendChild(opt);
    }
    locSelect.value = fixture.location || "";

    document.getElementById('bulbInputsContainer').innerHTML = ''; 
    fixture.bulbs.forEach(bulb => {
        window.addBulbInput(bulb.position, bulb.id);
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

window.addBulbInput = function(pos = "", id = "") {
    const container = document.getElementById('bulbInputsContainer');
    const inputDiv = document.createElement('div');
    inputDiv.className = 'bulb-row';
    inputDiv.style.display = "flex";
    inputDiv.style.gap = "8px";
    inputDiv.style.marginBottom = "5px";
    
    inputDiv.innerHTML = `
        <input type="hidden" class="bulb-id-input" value="${id}">
        <input type="text" class="bulb-pos-input" placeholder="Position (e.g., North, Middle, Main)" style="flex: 1;" value="${pos}" required>
        <button type="button" class="btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>
    `;
    
    container.appendChild(inputDiv);
};

window.openBulbLogModal = function(fixtureId, bulbId, positionName, fixtureName, lastBrand, lastBulbName, lastWattage, lastColor) {
    document.getElementById('bulbLogForm').reset();
    document.getElementById('bulbLogFixtureId').value = fixtureId;
    document.getElementById('bulbLogBulbId').value = bulbId;
    document.getElementById('bulbLogName').innerText = `${fixtureName} - ${positionName}`;
    document.getElementById('bulbLogDate').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('bulbLogBrand').value = lastBrand || "";
    document.getElementById('bulbLogBulbName').value = lastBulbName || "";
    document.getElementById('bulbLogWattage').value = lastWattage || "";
    document.getElementById('bulbLogColor').value = lastColor || "";
    
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

    const sortedFixtures = [...window.lightsData.fixtures].sort((a, b) => {
        if(a.location === b.location) return a.name.localeCompare(b.name);
        return a.location.localeCompare(b.location);
    });

    sortedFixtures.forEach(fixture => {
        let bulbHtml = '';
        
        fixture.bulbs.forEach(bulb => {
            let lastReplacedTxt = "Never replaced";
            let displayType = "Unknown";
            let historyHtml = '<p style="font-size: 0.8em; color: #888; font-style: italic;">No history yet.</p>';
            
            let currentBrand = "", currentBulbName = "", currentWattage = "", currentColor = "";
            
            if (bulb.history && bulb.history.length > 0) {
                const latest = bulb.history[0];
                
                // Extract properties (with fallback for legacy 'bulb_type' if it exists)
                currentBrand = latest.brand || "";
                currentBulbName = latest.bulb_name || latest.bulb_type || ""; 
                currentWattage = latest.wattage || "";
                currentColor = latest.color || "";
                
                // Build a nice display string for the main card view
                const parts = [currentBrand, currentBulbName, currentWattage, currentColor].filter(p => p !== "");
                displayType = parts.length > 0 ? parts.join(' | ') : "Unknown";
                
                lastReplacedTxt = `Replaced: ${window.formatDate(latest.date_replaced)}`;
                
                historyHtml = bulb.history.map(h => {
                    const hBrand = h.brand || "";
                    const hName = h.bulb_name || h.bulb_type || "";
                    const hWatt = h.wattage || "";
                    const hColor = h.color || "";
                    const hParts = [hBrand, hName, hWatt, hColor].filter(p => p !== "").join(' | ');
                    const hDisplay = hParts ? hParts : 'Unknown';
                    
                    return `<div style="font-size: 0.85em; border-bottom: 1px dashed #ddd; padding: 4px 0;">
                        <strong>${window.formatDate(h.date_replaced)}</strong> 
                        <br><span style="color: var(--text-light);">${hDisplay}</span>
                        ${h.cost > 0 ? ` <strong>($${h.cost})</strong>` : ''} 
                        ${h.notes ? `<br><em>Notes: ${h.notes}</em>` : ''}
                    </div>`;
                }).join('');
            }

            // Clean strings to pass into onclick securely
            const safeBrand = currentBrand.replace(/'/g, "\\'");
            const safeName = currentBulbName.replace(/'/g, "\\'");
            const safeWatt = currentWattage.replace(/'/g, "\\'");
            const safeColor = currentColor.replace(/'/g, "\\'");

            bulbHtml += `
                <div style="background: #fdfdfd; border: 1px solid #eee; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: var(--text-main); font-size: 0.95em;">💡 ${bulb.position}</div>
                            <div style="font-size: 0.85em; color: var(--text-light); margin-top: 4px;">
                                <strong>${displayType}</strong><br>
                                ${lastReplacedTxt}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <button class="btn-primary btn-sm" onclick="window.openBulbLogModal('${fixture.id}', '${bulb.id}', '${bulb.position}', '${fixture.name}', '${safeBrand}', '${safeName}', '${safeWatt}', '${safeColor}')">🔌 Replace</button>
                            <button class="btn-outline btn-sm" onclick="window.toggleBulbHistory('${bulb.id}')">🕒 History</button>
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
