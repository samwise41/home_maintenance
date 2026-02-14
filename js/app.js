window.formatDate = function(dateStr) {
    const dateObj = new Date(dateStr);
    const adjustedDate = new Date(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000));
    return adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
