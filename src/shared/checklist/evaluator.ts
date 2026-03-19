import type { Spec } from '../types/spec.js';
import type { ChecklistExpectation, ChecklistResult, ChecklistItem } from './types.js';

function getFailureMessage(id: string): string {
  switch (id) {
    case 'context-stack':
      return 'Add at least one technology to the stack in the Context section.';
    case 'context-patterns':
      return 'Add at least one architectural pattern to the Context section.';
    case 'context-conventions':
      return 'Add at least one coding convention to the Context section.';
    case 'context-auth':
      return 'Describe the authentication approach in the Context section.';
    case 'expectations-linked':
      return 'Link at least one Expectation to this Spec.';
    case 'expectations-desc':
      return 'All linked Expectations must have a non-empty description.';
    case 'expectations-edges':
      return 'All linked Expectations must have at least 2 edge cases.';
    case 'boundaries':
      return 'Define at least one boundary (what is out of scope).';
    case 'deliverables':
      return 'Define at least one deliverable (what will be produced).';
    case 'validation':
      return 'Add at least one automated validation step and one human validation step.';
    case 'peer-reviewed':
      return 'Mark this Spec as peer-reviewed before moving to Ready.';
    default:
      return 'This criterion has not been met.';
  }
}

export function evaluateChecklist(
  spec: Spec,
  expectations: ChecklistExpectation[]
): ChecklistResult {
  const items: ChecklistItem[] = [
    {
      id: 'context-stack',
      criterion: 'Context: stack is non-empty',
      passed: spec.context.stack.length > 0,
      message: '',
    },
    {
      id: 'context-patterns',
      criterion: 'Context: patterns is non-empty',
      passed: spec.context.patterns.length > 0,
      message: '',
    },
    {
      id: 'context-conventions',
      criterion: 'Context: at least one convention',
      passed: spec.context.conventions.length >= 1,
      message: '',
    },
    {
      id: 'context-auth',
      criterion: 'Context: auth is non-empty',
      passed: spec.context.auth.trim().length > 0,
      message: '',
    },
    {
      id: 'expectations-linked',
      criterion: 'At least one expectation linked',
      passed: expectations.length >= 1,
      message: '',
    },
    {
      id: 'expectations-desc',
      criterion: 'All expectations have descriptions',
      // Vacuous truth: every() on empty array returns true. Criterion 5 catches the empty case.
      passed: expectations.every((e) => e.description.trim().length > 0),
      message: '',
    },
    {
      id: 'expectations-edges',
      criterion: 'All expectations have 2+ edge cases',
      // Vacuous truth: every() on empty array returns true. Criterion 5 catches the empty case.
      passed: expectations.every((e) => e.edge_cases.length >= 2),
      message: '',
    },
    {
      id: 'boundaries',
      criterion: 'At least one boundary defined',
      passed: spec.boundaries.length >= 1,
      message: '',
    },
    {
      id: 'deliverables',
      criterion: 'At least one deliverable defined',
      passed: spec.deliverables.length >= 1,
      message: '',
    },
    {
      id: 'validation',
      criterion: 'At least one automated + one human validation',
      passed: spec.validation_automated.length >= 1 && spec.validation_human.length >= 1,
      message: '',
    },
    {
      id: 'peer-reviewed',
      criterion: 'Spec has been peer-reviewed',
      passed: spec.peer_reviewed === true,
      message: '',
    },
  ];

  for (const item of items) {
    if (!item.passed) {
      item.message = getFailureMessage(item.id);
    }
  }

  const passed = items.filter((i) => i.passed).length;
  return { items, passed, total: items.length, ready: passed === items.length };
}
