export const ProductStatus = {
  Discovery: 'Discovery',
  Active: 'Active',
  Maintenance: 'Maintenance',
  Sunset: 'Sunset',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const Priority = {
  Critical: 'Critical',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const IntentionStatus = {
  Draft: 'Draft',
  Defined: 'Defined',
  InProgress: 'InProgress',
  Fulfilled: 'Fulfilled',
  Deferred: 'Deferred',
} as const;
export type IntentionStatus = (typeof IntentionStatus)[keyof typeof IntentionStatus];

export const ExpectationStatus = {
  Draft: 'Draft',
  Ready: 'Ready',
  Specced: 'Specced',
  Validated: 'Validated',
  Done: 'Done',
} as const;
export type ExpectationStatus = (typeof ExpectationStatus)[keyof typeof ExpectationStatus];

export const SpecPhase = {
  Draft: 'Draft',
  Ready: 'Ready',
  InProgress: 'InProgress',
  Review: 'Review',
  Validating: 'Validating',
  Done: 'Done',
} as const;
export type SpecPhase = (typeof SpecPhase)[keyof typeof SpecPhase];

export const Complexity = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
} as const;
export type Complexity = (typeof Complexity)[keyof typeof Complexity];
