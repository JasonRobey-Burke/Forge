import { z } from 'zod';
import { SpecPhase } from '../types/enums.js';

export const transitionSpecSchema = z.object({
  to_phase: z.enum(Object.values(SpecPhase) as [string, ...string[]]),
  override_reason: z.string().optional(),
});
