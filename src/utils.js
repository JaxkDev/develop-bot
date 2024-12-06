/**
 * @param {Number} uptime 
 * @returns {String} Formatted uptime string
 */
function format_uptime(uptime){
    // Calculate days, hours, minutes, and seconds
    let days = Math.floor(uptime / (24 * 60 * 60));
    uptime %= 24 * 60 * 60;

    let hours = Math.floor(uptime / (60 * 60));
    uptime %= 60 * 60;

    let minutes = Math.floor(uptime / 60);
    let seconds = Math.floor(uptime % 60);

    // Dynamically build the result with non-zero units
    let result = [];
    if (days > 0) result.push({ unit: 'd', value: days });
    if (hours > 0 || result.length > 0) result.push({ unit: 'h', value: hours });
    if (minutes > 0 || result.length > 0) result.push({ unit: 'm', value: minutes });
    result.push({ unit: 's', value: seconds }); // Always include seconds as the lowest unit

    // Ensure exactly two units are shown
    return result.slice(0, 2)
        .map(entry => `${entry.value}${entry.unit}`)
        .join(' ');
}

/**
 * @param {Number} bytes 
 * @returns {String} Formatted bytes string
 */
function format_bytes(bytes){
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)}${units[i]}`;
}

module.exports = { format_uptime, format_bytes };