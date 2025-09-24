/**
 * Global Date and Time Formatting Utilities
 * 
 * Date Format: DD/MM/YYYY
 * Time Format: HH:MM:SS
 */

/**
 * Format a timestamp to DD/MM/YYYY HH:MM:SS
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted date and time string
 */
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format a timestamp to DD/MM/YYYY
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format a timestamp to HH:MM:SS
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted time string
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format a timestamp to a relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(timestamp);
  }
};

/**
 * Format a timestamp to a short date format (DD/MM/YY)
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Short formatted date string
 */
export const formatShortDate = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day}/${month}/${year}`;
};

/**
 * Format a timestamp to a long date format (DD Month YYYY)
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Long formatted date string
 */
export const formatLongDate = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

/**
 * Check if a timestamp is today
 * @param {string|Date} timestamp - The timestamp to check
 * @returns {boolean} True if the timestamp is today
 */
export const isToday = (timestamp) => {
  const today = new Date();
  const date = new Date(timestamp);
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if a timestamp is yesterday
 * @param {string|Date} timestamp - The timestamp to check
 * @returns {boolean} True if the timestamp is yesterday
 */
export const isYesterday = (timestamp) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(timestamp);
  
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Get a human-readable date description
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Human-readable date string
 */
export const getDateDescription = (timestamp) => {
  if (isToday(timestamp)) {
    return `Today at ${formatTime(timestamp)}`;
  } else if (isYesterday(timestamp)) {
    return `Yesterday at ${formatTime(timestamp)}`;
  } else {
    return formatTimestamp(timestamp);
  }
};
