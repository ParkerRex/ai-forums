export const isYouTubeUrl = (url: string): boolean => {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)/.test(url);
};

export const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)([^&\n?#]+)/);
  return match ? match[1] : null;
};
