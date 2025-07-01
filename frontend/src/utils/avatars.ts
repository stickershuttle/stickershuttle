// Default avatars available for assignment
export const defaultAvatars = [
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar1_dmnkat.png',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar2_iflxh7.png',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390215/StickerShuttle_Avatar3_ybu1x4.png',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751390217/StickerShuttle_Avatar4_ozomh4.png'
];

/**
 * Get a random default avatar URL
 * @returns {string} Random avatar URL from the default set
 */
export const getRandomAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * defaultAvatars.length);
  return defaultAvatars[randomIndex];
};

/**
 * Check if a given URL is one of our default avatars
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL is a default avatar
 */
export const isDefaultAvatar = (url: string): boolean => {
  return defaultAvatars.includes(url);
};

/**
 * Get the avatar number (1-4) for a given default avatar URL
 * @param {string} url - The avatar URL
 * @returns {number} The avatar number (1-4) or 0 if not a default avatar
 */
export const getAvatarNumber = (url: string): number => {
  const index = defaultAvatars.indexOf(url);
  return index !== -1 ? index + 1 : 0;
}; 