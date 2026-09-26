import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { Faq } from '../modules/faqs/faq.model';

/**
 * Seed the initial set of FAQs shown on the app's Support screen.
 *
 * Idempotent per-question: it inserts only the starter questions that aren't
 * already present (matched on exact `question` text), so running it repeatedly
 * never duplicates, and it never touches or clobbers FAQs the admins have added
 * or edited. Safe to re-run any time.
 *
 *   npm run seed:faqs
 */
const STARTER_FAQS = [
  {
    question: 'How do I book an appointment on OnChikitsa?',
    answer:
      'Open a clinic from the Explore or Home screen, pick an available slot, and tap “Book”. You’ll get a token number and can track your live queue position under Bookings.',
    order: 1,
    isActive: true,
  },
  {
    question: 'Can I see my place in the queue in real time?',
    answer:
      'Yes. Once a booking is live, the Bookings screen shows your token number, the number currently being served, and how many people are ahead of you — so you only need to head to the clinic when it’s nearly your turn.',
    order: 2,
    isActive: true,
  },
  {
    question: 'How do I cancel or reschedule a booking?',
    answer:
      'Go to Bookings, open the appointment you want to change, and choose Cancel or Reschedule. Cancelling frees your slot for others; rescheduling lets you pick a new time at the same clinic.',
    order: 3,
    isActive: true,
  },
  {
    question: 'Is my personal and health information secure?',
    answer:
      'Your data is protected and only shared with the clinic you book with, so they can serve you better. You control the demographic and health details you add under your profile.',
    order: 4,
    isActive: true,
  },
  {
    question: 'How do I contact support if I have a problem?',
    answer:
      'Open Profile → Support and switch to the Query tab. Write a short subject and your message, then tap Send. Our team receives it right away and will get back to you.',
    order: 5,
    isActive: true,
  },
];

async function seedFaqs(): Promise<void> {
  await connectDatabase();

  const questions = STARTER_FAQS.map((f) => f.question);
  const present = await Faq.find({ question: { $in: questions } }).select('question').lean();
  const existing = new Set(present.map((f) => f.question));
  const missing = STARTER_FAQS.filter((f) => !existing.has(f.question));

  if (missing.length === 0) {
    logger.info({ starters: STARTER_FAQS.length }, 'All starter FAQs already present — nothing to seed.');
    await disconnectDatabase();
    return;
  }

  const created = await Faq.insertMany(missing);
  logger.info({ inserted: created.length, skipped: STARTER_FAQS.length - missing.length }, 'Seeded missing starter FAQs.');
  await disconnectDatabase();
}

seedFaqs().catch((err) => {
  logger.error({ err }, 'Failed to seed FAQs');
  process.exit(1);
});
