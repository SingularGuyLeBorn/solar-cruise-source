const EXTERNAL = /^(?:[a-z]+:)?\/\//i;

export function assetPath(path) {
  if (!path) return '';
  if (EXTERNAL.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const base = import.meta.env.BASE_URL || '/';
  const clean = String(path).replace(/^\.?\/+/, '');
  return `${base}${clean}`;
}
