import type { Creator, Platform } from './types';

// Deliberately fictional, labeled sample records. Never mixed with live search results.
const rows: [string, string, Platform, number, string, string, boolean][] = [
  ['Maya Chen', 'mayamakes', 'youtube', 84200, 'I turn complicated AI tools into practical workflows. Weekly tutorials for founders, marketers, and curious builders.', 'AI workflows for a one-person marketing team', true],
  ['Alex Rivera', 'buildwithalex', 'instagram', 42600, 'Building better systems for small businesses. AI tools, automation, and the occasional coffee experiment.', 'Three automations I use every single day', true],
  ['Jordan Ellis', 'jordantechtalk', 'tiktok', 128000, 'Your friendly neighborhood tech explainer. Making AI a little less intimidating, one video at a time.', 'AI tools that actually earn their place in your stack', false],
  ['Priya Kapoor', 'priyagrowth', 'linkedin', 31600, 'Growth advisor for early-stage SaaS. Writing about AI, lean marketing teams, and systems that scale.', 'What a lean marketing stack looks like in practice', true],
  ['Sam Foster', 'samships', 'x', 18700, 'Indie builder. Testing automation tools in public. Notes on growing a small internet business.', 'My favorite AI workflow this week', false],
  ['Lena Brooks', 'lenalabs', 'youtube', 56700, 'Thoughtful tech reviews for real working days. Honest walkthroughs of AI tools and productivity systems.', 'An honest look at AI-powered research tools', true],
  ['Theo Park', 'theotools', 'instagram', 23800, 'A little tech, a little design. Tools that help creative people get their time back.', 'My five favorite AI shortcuts for content creation', false],
  ['Nora Williams', 'noraworks', 'tiktok', 67300, 'Marketing without the chaos. Automation ideas for e-commerce founders and solo marketers.', 'Turn one product shoot into a week of content', true],
];
export const sampleCreators: Creator[] = rows.map(([name, handle, platform, followers, bio, title, hasEmail], i) => {
  const url = { youtube: `https://www.youtube.com/@${handle}`, instagram: `https://www.instagram.com/${handle}/`, tiktok: `https://www.tiktok.com/@${handle}`, linkedin: `https://www.linkedin.com/in/${handle}/`, x: `https://x.com/${handle}` }[platform];
  return { id: `sample:${i}`, name, handle, platform, followers, bio, url, avatar: '', location: ['United States', 'United Kingdom', 'Canada'][i % 3], verified: false, websites: [`https://${handle}.example`], contacts: hasEmail ? [{ email: `hello@${handle}.example`, sourceUrl: url, source: 'Illustrative profile' }] : [], evidence: [{ kind: 'content', url, text: title }], matchedTerms: ['AI tools', 'automation'], collectedAt: '2026-10-13T00:00:00.000Z', sample: true };
});
