import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';
import { ageEligibilities, legalAcceptances, legalDocuments } from '../../db/schema';

export const REQUIRED_DOCUMENT_TYPES = ['TERMS_OF_USE', 'PRIVACY_NOTICE'] as const;

export type AgeEligibility = 'UNVERIFIED' | '18_PLUS' | 'UNDER_18';

export interface RequiredAcceptance {
  documentType: string;
  version: string;
}

export interface PrivacyGateState {
  ageEligibility: AgeEligibility;
  missingAcceptances: RequiredAcceptance[];
  requiresOnboarding: boolean;
}

/**
 * Reads the minimal age-eligibility outcome and the current published, counsel-approved documents
 * that still need acceptance. Absent age evidence is `UNVERIFIED`; nothing is inferred.
 */
@Injectable()
export class PrivacyGateService {
  constructor(@Inject(DATABASE) private readonly db: Database | undefined) {}

  async stateFor(userId: string): Promise<PrivacyGateState> {
    const db = this.database();
    const [age] = await db
      .select({ status: ageEligibilities.status })
      .from(ageEligibilities)
      .where(eq(ageEligibilities.userId, userId))
      .limit(1);

    const published = await db
      .select({
        documentType: legalDocuments.type,
        version: legalDocuments.version,
        publishedAt: legalDocuments.publishedAt,
      })
      .from(legalDocuments)
      .where(
        and(
          eq(legalDocuments.status, 'PUBLISHED'),
          inArray(legalDocuments.type, [...REQUIRED_DOCUMENT_TYPES]),
        ),
      )
      .orderBy(desc(legalDocuments.publishedAt));

    const latest = new Map<string, string>();
    for (const document of published) {
      if (!latest.has(document.documentType)) latest.set(document.documentType, document.version);
    }

    const accepted = await db
      .select({ documentType: legalAcceptances.documentType, version: legalAcceptances.version })
      .from(legalAcceptances)
      .where(eq(legalAcceptances.userId, userId));
    const acceptedKeys = new Set(accepted.map((row) => `${row.documentType}:${row.version}`));

    const ageEligibility = age?.status ?? 'UNVERIFIED';
    const missingAcceptances = [...latest.entries()]
      .filter(([documentType, version]) => !acceptedKeys.has(`${documentType}:${version}`))
      .map(([documentType, version]) => ({ documentType, version }));

    return {
      ageEligibility,
      missingAcceptances,
      requiresOnboarding: ageEligibility !== '18_PLUS' || missingAcceptances.length > 0,
    };
  }

  private database(): Database {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    return this.db;
  }
}
