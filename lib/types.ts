export interface Occupation {
  userLink: string;
  keyId: string;
  iscoGroupCode: string;
  code: string;
  preferredLabel: string;
  exampleAlternateDesignation: string;
  coreDescription: string;
  iscoTaxIncluded: string;
  definition: string;
  scopeNote: string;
  regulatedProfessionNote: string;
  occupationType: string;
  status: string;
}

export interface OccupationGroup {
  code: string;
  name: string;
  children: (OccupationGroup | Occupation)[];
  isExpanded?: boolean;
}