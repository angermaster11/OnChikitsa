import { Legal, LEGAL_SETTINGS_KEY, type LegalDoc } from './legal.model';
import type { UpdateLegalBody } from './legal.validation';
import { AppError, ERROR_CODES } from '../../utils/errors';

let legalCache: { doc: LegalDoc; at: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadLegalDoc(): Promise<LegalDoc> {
  const doc = await Legal.findOneAndUpdate(
    { key: LEGAL_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: LEGAL_SETTINGS_KEY,
        privacyPolicy: '',
        termsAndConditions: '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (!doc) throw new AppError(500, ERROR_CODES.INTERNAL_ERROR, 'Failed to load legal settings');
  return doc;
}

export const legalService = {
  async getLegal(): Promise<LegalDoc> {
    const now = Date.now();
    if (legalCache && now - legalCache.at < CACHE_TTL_MS) {
      return legalCache.doc;
    }
    const doc = await loadLegalDoc();
    legalCache = { doc, at: now };
    return doc;
  },

  async updateLegal(data: UpdateLegalBody): Promise<LegalDoc> {
    const doc = await loadLegalDoc();
    if (data.privacyPolicy !== undefined) doc.privacyPolicy = data.privacyPolicy;
    if (data.termsAndConditions !== undefined) doc.termsAndConditions = data.termsAndConditions;
    
    await doc.save();
    legalCache = { doc, at: Date.now() };
    return doc;
  },
};
