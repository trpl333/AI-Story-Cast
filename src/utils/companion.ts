import { companionResponses } from '../data/books';

/**
 * Simple keyword-based response engine.
 * In a production app this would call an LLM API.
 */
export function getCompanionResponse(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('alice'))       return companionResponses.alice;
  if (q.includes('rabbit'))      return companionResponses.rabbit;
  if (q.includes('cat') || q.includes('cheshire')) return companionResponses.cat;
  if (q.includes('hatter') || q.includes('mad'))   return companionResponses.hatter;
  if (q.includes('queen'))       return companionResponses.queen;
  if (q.includes('wonderland'))  return companionResponses.wonderland;
  if (q.includes('curious') || q.includes('curiouser')) return companionResponses.curious;
  if (q.includes('fall') || q.includes('rabbit-hole') || q.includes('hole')) return companionResponses.fall;
  if (q.includes('read') || q.includes('book') || q.includes('wrote') || q.includes('author')) return companionResponses.read;

  return companionResponses.default;
}
