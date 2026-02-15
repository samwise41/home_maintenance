// ==========================================
// 2. TAB NAVIGATION & MOBILE MENU
// ==========================================
window.toggleMenu = function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobile-overlay').classList.toggle('open');
};

window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
    
    // Automatically close the mobile menu after making a selection
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('open')) {
        window.toggleMenu();
    }
};

// ... keep everything else identical until Section 7 ...

// ==========================================
// 7. VIEW COORDINATOR
// ==========================================
window.renderAllViews = function() {
    // These functions live in the other tab-*.js files
    if(window.renderDashboard) window.renderDashboard();
    if(window.renderTimeline) window.renderTimeline();
    if(window.renderAllTasks) window.renderAllTasks();
    if(window.renderSettings) window.renderSettings();
};
