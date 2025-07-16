import { readFileSync } from 'fs';
import { join } from 'path';

export function loadPrompt(filename: string): string {
  try {
    const promptPath = join(process.cwd(), 'src', 'prompts', filename);
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading prompt ${filename}:`, error);
    return '';
  }
}

export function formatPrompt(template: string, variables: Record<string, string>): string {
  let formatted = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return formatted;
} 