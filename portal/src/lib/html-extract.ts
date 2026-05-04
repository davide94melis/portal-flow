export function extractHtmlFromMarkdown(text: string): string | null {
  const fenceMatch = text.match(/```html\s*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const doctypeMatch = text.match(/(<!DOCTYPE html>[\s\S]*<\/html>)/i);
  if (doctypeMatch) return doctypeMatch[1].trim();

  const htmlTagMatch = text.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();

  return null;
}
