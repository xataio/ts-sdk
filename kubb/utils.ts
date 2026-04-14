export function kubbCamelCase(text: string): string {
  return text
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .split(/[\s\-_./\\:]+/)
    .filter(Boolean)
    .map((word, i) => {
      if (word.length > 1 && word === word.toUpperCase()) return word;
      if (i === 0) return word.charAt(0).toLowerCase() + word.slice(1);
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '');
}

export function toTemplateLiteral(path: string, casing?: 'camelcase'): string {
  const replaced = path.replace(/\{([^}]+)\}/g, (_, param: string) => {
    const name = casing === 'camelcase' ? kubbCamelCase(param) : param;
    return `\${${name}}`;
  });
  return `\`${replaced}\``;
}
