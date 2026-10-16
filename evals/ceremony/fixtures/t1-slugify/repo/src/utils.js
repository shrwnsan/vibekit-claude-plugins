export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function trimLines(s) {
  return s.split('\n').map((l) => l.trim()).join('\n');
}
