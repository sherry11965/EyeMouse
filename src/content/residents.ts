import type { ResidentPersona } from '../core/types';

export const RESIDENTS: ResidentPersona[] = [
  {
    id: 'elara',
    name: 'Elara',
    occupation: 'Baker',
    personality: 'Warm, motherly, tends to gossip but means well.',
    goals: ['Bake the best bread in town', 'Help new residents feel welcome'],
    speechStyle: 'Cheerful, uses baking metaphors.',
    spriteKey: 'baker_pink',
    home: 'residential',
    workplace: 'shops'
  },
  {
    id: 'tobias',
    name: 'Tobias',
    occupation: 'Librarian',
    personality: 'Quiet, curious, slightly anxious, loves mysteries.',
    goals: ['Catalog every book in town', 'Solve the mystery of the missing mayor'],
    speechStyle: 'Formal, precise, occasionally poetic.',
    spriteKey: 'mage_blue',
    home: 'residential',
    workplace: 'shops'
  },
  {
    id: 'mae',
    name: 'Mae',
    occupation: 'Farmer',
    personality: 'Hardworking, practical, country wisdom.',
    goals: ['Harvest a great crop this season', 'Protect the forest from loggers'],
    speechStyle: 'Plainspoken, short sentences.',
    spriteKey: 'farmer_green',
    home: 'farm',
    workplace: 'farm'
  },
  {
    id: 'finn',
    name: 'Finn',
    occupation: 'Fisherman',
    personality: 'Laid-back, funny, tells tall tales.',
    goals: ['Catch the legendary giant fish', 'Hear a good story before bed'],
    speechStyle: 'Coastal slang, jokes and exclamations.',
    spriteKey: 'sailor_red',
    home: 'seaside',
    workplace: 'seaside'
  },
  {
    id: 'nyx',
    name: 'Nyx',
    occupation: 'Mysterious Traveler',
    personality: 'Cryptic, kind under aloofness, knows secrets.',
    goals: ['Find what they came for — they will not say what it is'],
    speechStyle: 'Vague, riddles, pauses.',
    spriteKey: 'mage_purple',
    home: 'forest',
    workplace: 'forest'
  },
  {
    id: 'rosalind',
    name: 'Mayor Rosalind',
    occupation: 'Mayor (missing)',
    personality: 'Pragmatic leader, kept the town running.',
    goals: ['Was investigating the Old Shrine before vanishing'],
    speechStyle: 'Steady, civic-minded.',
    spriteKey: 'knight_yellow',
    home: 'plaza',
    workplace: 'plaza'
  }
];

export function getResident(id: string): ResidentPersona | undefined {
  return RESIDENTS.find(r => r.id === id);
}
