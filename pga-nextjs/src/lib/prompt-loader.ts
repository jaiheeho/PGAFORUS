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
  
  // Handle conditional sections first
  // Check if tournament has started based on variables
  const tournamentStarted = variables.has_started === 'true';
  
  if (tournamentStarted) {
    // Remove the "if_tournament_not_started" sections
    formatted = formatted.replace(/\{if_tournament_not_started\}[\s\S]*?\{endif_tournament_not_started\}/g, '');
    // Remove the conditional markers for started sections
    formatted = formatted.replace(/\{if_tournament_started\}/g, '');
    formatted = formatted.replace(/\{endif_tournament_started\}/g, '');
  } else {
    // Remove the "if_tournament_started" sections
    formatted = formatted.replace(/\{if_tournament_started\}[\s\S]*?\{endif_tournament_started\}/g, '');
    // Remove the conditional markers for not started sections
    formatted = formatted.replace(/\{if_tournament_not_started\}/g, '');
    formatted = formatted.replace(/\{endif_tournament_not_started\}/g, '');
  }
  
  // Replace regular variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return formatted;
} 