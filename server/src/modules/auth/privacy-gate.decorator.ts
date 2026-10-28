import { SetMetadata } from '@nestjs/common';

export const PRIVACY_GATE_EXEMPT = 'privacyGateExempt';

/**
 * Exempts a handler from the age/acceptance gate. Only flows needed to resolve the gate itself
 * (privacy status, age declaration, acceptance, rights requests, export) and account rendering
 * may use this; never a normal product action.
 */
export const PrivacyGateExempt = () => SetMetadata(PRIVACY_GATE_EXEMPT, true);