export const MOCK_QUESTIONS = {
  'software-engineer': [
    'Walk me through how you would design a rate limiter for a distributed API.',
    'Describe a time you debugged a production issue under time pressure.',
    'How would you optimize a slow database query affecting user-facing latency?',
  ],
  'product-manager': [
    'How would you prioritize features when engineering capacity is limited?',
    'Tell me about a product decision you made with incomplete data.',
    'How do you align stakeholders when product and engineering disagree?',
  ],
  'data-analyst': [
    'How would you measure the success of a new onboarding funnel?',
    'Walk me through an A/B test you designed and what you learned.',
    'How do you communicate ambiguous findings to non-technical stakeholders?',
  ],
  'behavioral-hr': [
    'Tell me about a conflict you resolved on a cross-functional team.',
    'Describe a situation where you received critical feedback. How did you respond?',
    'Give an example of when you had to influence without authority.',
  ],
  'system-design': [
    'Design a real-time notification system for 10 million daily active users.',
    'How would you architect a URL shortener with analytics at scale?',
    'Walk through the trade-offs of caching strategies in a read-heavy service.',
  ],
}

export function getQuestionsForRole(roleId) {
  return MOCK_QUESTIONS[roleId] ?? MOCK_QUESTIONS['software-engineer']
}
