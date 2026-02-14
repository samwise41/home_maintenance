window.renderSettings = function() {
    // Render Locations
    const locList = document.getElementById('locations-manager-list');
    locList.innerHTML = '';
    window.appLocations.forEach((loc, index) => {
        const div = document.createElement('div');
        div.className = 'location-list-item';
        div.innerHTML = `<span>${loc}</span><button class="btn-danger btn-sm" onclick="window.deleteLocation(${index})">X</button>`;
        locList.appendChild(div);
    });

    // Render Categories
    const catList = document.getElementById('categories-manager-list');
    catList.innerHTML = '';
    window.appCategories.forEach((cat, index) => {
        const div = document.createElement('div');
        div.className = 'location-list-item';
        div.innerHTML = `<span>${cat}</span><button class="btn-danger btn-sm" onclick="window.deleteCategory(${index})">X</button>`;
        catList.appendChild(div);
    });
};
