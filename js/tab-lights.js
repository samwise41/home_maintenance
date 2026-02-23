window.initLights = function() {
    document.getElementById('tab-lights').innerHTML = `
        <div class="header">
            <h2>💡 Lighting & Fixtures</h2>
            <div class="header-actions">
                <input type="text" id="search-lights" class="search-input" placeholder="🔍 Search fixtures or bulbs..." oninput="window.renderLights()">
                <button class="btn-outline" onclick="window.openReceiptsModal()" style="background: white;">🧾 Receipts</button>
                <button class="btn-primary" onclick="window.openFixtureModal()">+ Add Fixture</button>
            </div>
        </div>
        <div id="lights-list"><p>Loading fixtures...</p></div>
    `;

    // Handle Fixture Form Submission
    document.getElementById('fixtureForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fixtureId = document.getElementById('fixtureId').value;
        const fixtureName = document.getElementById('fixtureName').value;
        const fixtureLocation = document.getElementById('fixtureLocation').value;
        
        let existingFixture = null;
        if(fixtureId) existingFixture = window.lightsData.fixtures.find(f => f.id === fixtureId);

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
                bulbs.push({ id: newBulbId, position: posInput, history: history });
            }
        });

        if (fixtureId && existingFixture) {
            existingFixture.name = fixtureName;
            existingFixture.location = fixtureLocation;
            existingFixture.bulbs = bulbs;
        } else {
            window.lightsData.fixtures.push({
                id: 'fixture-' + Date.now(),
                name: fixtureName,
                location: fixtureLocation,
                bulbs: bulbs
            });
        }

        window.closeModal('fixtureModal');
        window.renderLights();
        await window.saveLightsToGitHub();
    });

    // Handle Bulb Replacement Log
    document.getElementById('bulbLogForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const fixId = document.getElementById('bulbLogFixtureId').value;
        const bulbId = document.getElementById('bulbLogBulbId').value;
        const historyIndex = document.getElementById('bulbLogHistoryIndex').value;
        
        const logDate = document.getElementById('bulbLogDate').value;
        const logPurchaseDate = document.getElementById('bulbLogPurchaseDate').value; 
        const logBrand = document.getElementById('bulbLogBrand').value.trim();
        const logBulbName = document.getElementById('bulbLogBulbName').value.trim();
        const logSize = document.getElementById('bulbLogSize').value.trim();
        const logWattage = document.getElementById('bulbLogWattage').value.trim();
        const logColor = document.getElementById('bulbLogColor').value.trim();
        const logBrightness = document.getElementById('bulbLogBrightness').value.trim();
        const logWarranty = document.getElementById('bulbLogWarranty').value.trim();
        const logCost = parseFloat(document.getElementById('bulbLogCost').value) || 0;
        const logNotes = document.getElementById('bulbLogNotes').value;

        const fixture = window.lightsData.fixtures.find(f => f.id === fixId);
        if(fixture) {
            const bulb = fixture.bulbs.find(b => b.id === bulbId);
            if(bulb) {
                const logEntry = {
                    date_replaced: logDate, 
                    purchase_date: logPurchaseDate, 
                    brand: logBrand, 
                    bulb_name: logBulbName,
                    size: logSize, 
                    wattage: logWattage, 
                    color: logColor, 
                    brightness: logBrightness, 
                    warranty: logWarranty, 
                    cost: logCost, 
                    notes: logNotes
                };

                if (historyIndex !== "") {
                    bulb.history[parseInt(historyIndex)] = logEntry;
                } else {
                    bulb.history.push(logEntry);
                }
                
                bulb.history.sort((a, b) => new Date(b.date_replaced) - new Date(a.date_replaced));
            }
        }

        window.closeModal('bulbLogModal');
        window.renderLights();
        await window.saveLightsToGitHub();
    });

    // NEW: Handle Central Receipt Upload
    document.getElementById('receiptForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const rDate = document.getElementById('receiptDate').value;
        const rNotes = document.getElementById('receiptNotes').value;
        const fileInput = document.getElementById('receiptFile');

        if (fileInput.files.length === 0) return;

        window.showStatusMsg("⏳ Uploading receipt to GitHub...", "blue");
        
        try {
            const file = fileInput.files[0];
            const ext = file.name.split('.').pop();
            const filename = `receipt_${Date.now()}.${ext}`;
            const path = `receipts/lights/${filename}`; 
            
            const base64Data = await window.getBase64(file);
            const base64Content = base64Data.split(',')[1]; 
            
            await window.uploadFileToGitHub(path, base64Content);
            
            if(!window.lightsData.receipts) window.lightsData.receipts = [];
            
            window.lightsData.receipts.push({
                date: rDate,
                notes: rNotes,
                path: path,
                id: 'receipt-' + Date.now()
            });

            // Sort receipts newest first
            window.lightsData.receipts.sort((a, b) => new Date(b.date) - new Date(a.date));

            document.getElementById('receiptForm').reset();
            window.renderReceipts();
            await window.saveLightsToGitHub();
            window.showStatusMsg("✅ Receipt Saved!", "green");

        } catch (err) {
            window.showStatusMsg("❌ Error uploading receipt.", "red");
        }
    });
};

// Fixture UI Modals
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
    fixture.bulbs.forEach(bulb => window.addBulbInput(bulb.position, bulb.id));
    document.getElementById('fixtureModal').style.display = "block";
};

window.deleteFixture = async function() {
    const id = document.getElementById('fixtureId').value;
    if (!id || !confirm("Are you sure you want to delete this fixture? All bulb history will be lost.")) return; 
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
        <input type="text" class="bulb-pos-input" placeholder="Position (e.g., North, Middle)" style="flex: 1;" value="${pos}" required>
        <button type="button" class="btn-danger btn-sm" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(inputDiv);
};

// Bulb Replacement UI Modals
window.openBulbLogModal = function(fixtureId, bulbId, positionName, fixtureName, lastBrand, lastBulbName, lastSize, lastWattage, lastColor, lastBrightness, lastWarranty, lastPurchaseDate) {
    document.getElementById('bulbLogForm').reset();
    document.getElementById('bulbLogModalTitle').innerText = "🔌 Replace Bulb";
    document.getElementById('deleteLogBtn').style.display = "none"; 
    
    document.getElementById('bulbLogFixtureId').value = fixtureId;
    document.getElementById('bulbLogBulbId').value = bulbId;
    document.getElementById('bulbLogHistoryIndex').value = ""; 
    
    document.getElementById('bulbLogName').innerText = `${fixtureName} - ${positionName}`;
    document.getElementById('bulbLogDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('bulbLogPurchaseDate').value = lastPurchaseDate || ""; 
    
    document.getElementById('bulbLogBrand').value = lastBrand || "";
    document.getElementById('bulbLogBulbName').value = lastBulbName || "";
    document.getElementById('bulbLogSize').value = lastSize || "";
    document.getElementById('bulbLogWattage').value = lastWattage || "";
    document.getElementById('bulbLogColor').value = lastColor || "";
    document.getElementById('bulbLogBrightness').value = lastBrightness || "";
    document.getElementById('bulbLogWarranty').value = lastWarranty || "";
    
    document.getElementById('bulbLogModal').style.display = "block";
};

window.editBulbHistory = function(fixtureId, bulbId, historyIndex) {
    const fixture = window.lightsData.fixtures.find(f => f.id === fixtureId);
    if(!fixture) return;
    const bulb = fixture.bulbs.find(b => b.id === bulbId);
    if(!bulb) return;
    const entry = bulb.history[historyIndex];
    if(!entry) return;

    document.getElementById('bulbLogForm').reset();
    document.getElementById('bulbLogModalTitle').innerText = "✏️ Edit History Log";
    document.getElementById('deleteLogBtn').style.display = "block"; 

    document.getElementById('bulbLogFixtureId').value = fixtureId;
    document.getElementById('bulbLogBulbId').value = bulbId;
    document.getElementById('bulbLogHistoryIndex').value = historyIndex; 
    
    document.getElementById('bulbLogName').innerText = `${fixture.name} - ${bulb.position}`;
    document.getElementById('bulbLogDate').value = entry.date_replaced || "";
    document.getElementById('bulbLogPurchaseDate').value = entry.purchase_date || ""; 
    
    document.getElementById('bulbLogBrand').value = entry.brand || "";
    document.getElementById('bulbLogBulbName').value = entry.bulb_name || entry.bulb_type || "";
    document.getElementById('bulbLogSize').value = entry.size || "";
    document.getElementById('bulbLogWattage').value = entry.wattage || "";
    document.getElementById('bulbLogColor').value = entry.color || "";
    document.getElementById('bulbLogBrightness').value = entry.brightness || "";
    document.getElementById('bulbLogWarranty').value = entry.warranty || "";
    document.getElementById('bulbLogCost').value = entry.cost || "";
    document.getElementById('bulbLogNotes').value = entry.notes || "";
    
    document.getElementById('bulbLogModal').style.display = "block";
};

window.deleteBulbHistory = async function() {
    const fixId = document.getElementById('bulbLogFixtureId').value;
    const bulbId = document.getElementById('bulbLogBulbId').value;
    const historyIndex = document.getElementById('bulbLogHistoryIndex').value;

    if (historyIndex === "" || !confirm("Delete this history entry permanently?")) return;

    const fixture = window.lightsData.fixtures.find(f => f.id === fixId);
    if(fixture) {
        const bulb = fixture.bulbs.find(b => b.id === bulbId);
        if(bulb) {
            bulb.history.splice(parseInt(historyIndex), 1);
        }
    }

    window.closeModal('bulbLogModal');
    window.renderLights();
    await window.saveLightsToGitHub();
};

window.toggleBulbHistory = function(bulbId) {
    const el = document.getElementById('bulb-hist-' + bulbId);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// NEW: Central Receipt UI Controllers
window.openReceiptsModal = function() {
    document.getElementById('receiptForm').reset();
    document.getElementById('receiptDate').value = new Date().toISOString().split('T')[0];
    window.renderReceipts();
    document.getElementById('receiptsModal').style.display = 'block';
};

window.renderReceipts = function() {
    const container = document.getElementById('receiptsListContainer');
    container.innerHTML = '';

    if(!window.lightsData.receipts || window.lightsData.receipts.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px 0; color: var(--text-light);">No receipts uploaded yet.</p>';
        return;
    }

    window.lightsData.receipts.forEach((r, index) => {
        const div = document.createElement('div');
        div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 10px; border-bottom: 1px solid #eee;";
        div.innerHTML = `
            <div>
                <strong>${window.formatDate(r.date)}</strong>
                <div style="font-size: 0.85em; color: var(--text-light); margin-top: 2px;">${r.notes}</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <a href="${r.path}" target="_blank" class="btn-outline btn-sm" style="text-decoration: none; padding: 4px 10px;">🧾 View</a>
                <button class="btn-danger btn-sm" onclick="window.deleteReceipt(${index})">🗑️</button>
            </div>
        `;
        container.appendChild(div);
    });
};

window.deleteReceipt = async function(index) {
    if(!confirm("Remove this receipt? (The file will remain safely in GitHub, but will be removed from this list)")) return;
    window.lightsData.receipts.splice(index, 1);
    window.renderReceipts();
    await window.saveLightsToGitHub();
};

// Main Rendering Function
window.renderLights = function() {
    const container = document.getElementById('lights-list');
    if (!container) return;
    container.innerHTML = '';

    if (!window.lightsData || !window.lightsData.fixtures || window.lightsData.fixtures.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No fixtures found. Click Add New Fixture to get started.</p>';
        return;
    }

    const query = document.getElementById('search-lights') ? document.getElementById('search-lights').value.toLowerCase() : '';
    
    const filteredFixtures = window.lightsData.fixtures.filter(fixture => {
        if (!query) return true;
        if ((fixture.name || '').toLowerCase().includes(query) || 
            (fixture.location || '').toLowerCase().includes(query)) {
            return true;
        }
        return fixture.bulbs.some(bulb => {
            if ((bulb.position || '').toLowerCase().includes(query)) return true;
            if (bulb.history && bulb.history.length > 0) {
                const latest = bulb.history[0];
                const searchStr = `${latest.brand || ''} ${latest.bulb_name || latest.bulb_type || ''} ${latest.size || ''} ${latest.color || ''}`.toLowerCase();
                if (searchStr.includes(query)) return true;
            }
            return false;
        });
    });

    const sortedFixtures = [...filteredFixtures].sort((a, b) => {
        if(a.location === b.location) return a.name.localeCompare(b.name);
        return a.location.localeCompare(b.location);
    });

    if (sortedFixtures.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">No fixtures match your search.</p>';
        return;
    }

    sortedFixtures.forEach(fixture => {
        let bulbHtml = '';
        
        fixture.bulbs.forEach(bulb => {
            let lastReplacedTxt = "Never replaced";
            let displayType = "Unknown";
            let historyHtml = '<p style="font-size: 0.8em; color: #888; font-style: italic;">No history yet.</p>';
            
            let cBrand = "", cName = "", cSize = "", cWatt = "", cColor = "", cBright = "", cWarranty = "", cPurchaseDate = "";
            
            if (bulb.history && bulb.history.length > 0) {
                const latest = bulb.history[0];
                
                cBrand = latest.brand || "";
                cName = latest.bulb_name || latest.bulb_type || ""; 
                cSize = latest.size || "";
                cWatt = latest.wattage || "";
                cColor = latest.color || "";
                cBright = latest.brightness || "";
                cWarranty = latest.warranty || "";
                cPurchaseDate = latest.purchase_date || "";
                
                const parts = [cBrand, cName, cSize, cWatt, cColor, cBright].filter(p => p !== "");
                displayType = parts.length > 0 ? parts.join(' | ') : "Unknown";
                
                lastReplacedTxt = `Replaced: ${window.formatDate(latest.date_replaced)}`;
                
                historyHtml = bulb.history.map((h, index) => {
                    const hBrand = h.brand || "";
                    const hName = h.bulb_name || h.bulb_type || "";
                    const hSize = h.size || "";
                    const hWatt = h.wattage || "";
                    const hColor = h.color || "";
                    const hBright = h.brightness || "";
                    const hWarranty = h.warranty ? `${h.warranty}yr Warranty` : "";
                    
                    const hParts = [hBrand, hName, hSize, hWatt, hColor, hBright, hWarranty].filter(p => p !== "").join(' | ');
                    const hDisplay = hParts ? hParts : 'Unknown';
                    const hPurchTxt = h.purchase_date ? ` (Purchased: ${window.formatDate(h.purchase_date)})` : "";
                    
                    return `<div style="font-size: 0.85em; border-bottom: 1px dashed #ddd; padding: 6px 0; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong>${window.formatDate(h.date_replaced)}</strong><span style="color: #666; font-size: 0.9em;">${hPurchTxt}</span> 
                            <br><span style="color: var(--text-light);">${hDisplay}</span>
                            ${h.cost > 0 ? ` <strong>($${h.cost})</strong>` : ''} 
                            ${h.notes ? `<br><em>Notes: ${h.notes}</em>` : ''}
                        </div>
                        <button class="btn-outline btn-sm" onclick="window.editBulbHistory('${fixture.id}', '${bulb.id}', ${index})" style="padding: 2px 6px; font-size: 0.8em;">✏️</button>
                    </div>`;
                }).join('');
            }

            const safeBrand = cBrand.replace(/'/g, "\\'");
            const safeName = cName.replace(/'/g, "\\'");
            const safeSize = cSize.replace(/'/g, "\\'");
            const safeWatt = cWatt.replace(/'/g, "\\'");
            const safeColor = cColor.replace(/'/g, "\\'");
            const safeBright = cBright.replace(/'/g, "\\'");
            const safeWarranty = cWarranty.replace(/'/g, "\\'");
            const safePurchaseDate = cPurchaseDate.replace(/'/g, "\\'");

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
                            <button class="btn-primary btn-sm" onclick="window.openBulbLogModal('${fixture.id}', '${bulb.id}', '${bulb.position}', '${fixture.name}', '${safeBrand}', '${safeName}', '${safeSize}', '${safeWatt}', '${safeColor}', '${safeBright}', '${safeWarranty}', '${safePurchaseDate}')">🔌 Replace</button>
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
