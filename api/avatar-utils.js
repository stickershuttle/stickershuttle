// Default avatars available for assignment
const defaultAvatars = [
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar1_dmnkat.png',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar2_iflxh7.png',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar3_ybu1x4.png',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390217/StickerShuttle_Avatar4_ozomh4.png'
];

/**
 * Get a random default avatar URL
 * @returns {string} Random avatar URL from the default set
 */
function getRandomAvatar() {
  const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
  return defaultAvatars[randomIndex];
}

/**
 * Check if a given URL is one of our default avatars
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a default avatar
 */
function isDefaultAvatar(url) {
  return defaultAvatars.includes(url);
}

/**
 * Get the avatar number (1-4) for a given default avatar URL
 * @param {string} url - The avatar URL
 * @returns {number} The avatar number (1-4) or 0 if not a default avatar
 */
function getAvatarNumber(url) {
  const index = defaultAvatars.indexOf(url);
  return index !== -1 ? index + 1 : 0;
}

module.exports = {
  defaultAvatars,
  getRandomAvatar,
  isDefaultAvatar,
  getAvatarNumber
}; 