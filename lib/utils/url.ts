export function isValidYouTubeUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.includes('youtube.com/') || trimmed.includes('youtu.be/');
}
