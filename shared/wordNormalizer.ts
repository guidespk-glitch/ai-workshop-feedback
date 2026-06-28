import type { WordResult } from './results';
import { WORD_ALIAS_GROUPS } from './wordAliases';

const EDGE_PUNCTUATION = /^\p{P}+|\p{P}+$/gu;

interface MutableWordGroup {
  key: string;
  fixedLabel?: string;
  count: number;
  order: number;
  labels: Map<string, { count: number; order: number }>;
}

function cleanDisplayValue(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ').replace(EDGE_PUNCTUATION, '');
}

export function normalizeAnswer(value: string): string {
  return cleanDisplayValue(value).toLocaleLowerCase('th-TH');
}

function levenshtein(left: string, right: string): number {
  const a = Array.from(left);
  const b = Array.from(right);
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 0; row < a.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row + 1;

    for (let column = 0; column < b.length; column += 1) {
      const above = previous[column + 1];
      const substitution = diagonal + (a[row] === b[column] ? 0 : 1);
      const insertion = previous[column] + 1;
      const deletion = above + 1;
      previous[column + 1] = Math.min(substitution, insertion, deletion);
      diagonal = above;
    }
  }

  return previous[b.length] ?? a.length;
}

export function similarity(left: string, right: string): number {
  const leftLength = Array.from(left).length;
  const rightLength = Array.from(right).length;
  const longest = Math.max(leftLength, rightLength, 1);
  return 1 - levenshtein(left, right) / longest;
}

const aliasLookup = new Map(
  WORD_ALIAS_GROUPS.flatMap((group) =>
    group.variants.map((variant) => [normalizeAnswer(variant), group] as const),
  ),
);

function isCloseMatch(left: string, right: string): boolean {
  const leftLength = Array.from(left).length;
  const rightLength = Array.from(right).length;
  return (
    leftLength >= 4 &&
    rightLength >= 4 &&
    Math.abs(leftLength - rightLength) <= 2 &&
    similarity(left, right) >= 0.88
  );
}

function chooseLabel(group: MutableWordGroup): string {
  if (group.fixedLabel) return group.fixedLabel;

  return [...group.labels.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[1].order - right[1].order)[0][0];
}

export function groupAnswers(values: readonly string[]): WordResult[] {
  const groups: MutableWordGroup[] = [];

  values.forEach((rawValue, valueIndex) => {
    const displayValue = cleanDisplayValue(rawValue);
    const normalizedValue = normalizeAnswer(rawValue);
    if (!normalizedValue) return;

    const alias = aliasLookup.get(normalizedValue);
    const key = alias?.key ?? normalizedValue;
    let group = groups.find((candidate) => candidate.key === key);

    if (!group && !alias) {
      group = groups.find((candidate) => !candidate.fixedLabel && isCloseMatch(candidate.key, key));
    }

    if (!group) {
      group = {
        key,
        fixedLabel: alias?.label,
        count: 0,
        order: groups.length,
        labels: new Map(),
      };
      groups.push(group);
    }

    group.count += 1;
    const label = group.fixedLabel ?? displayValue;
    const labelEntry = group.labels.get(label);
    group.labels.set(label, {
      count: (labelEntry?.count ?? 0) + 1,
      order: labelEntry?.order ?? valueIndex,
    });
  });

  return groups
    .sort((left, right) => right.count - left.count || left.order - right.order)
    .map((group) => ({ key: group.key, label: chooseLabel(group), count: group.count }));
}
