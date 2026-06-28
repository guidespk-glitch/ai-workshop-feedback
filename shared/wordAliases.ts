export interface WordAliasGroup {
  key: string;
  label: string;
  variants: readonly string[];
}

export const WORD_ALIAS_GROUPS: readonly WordAliasGroup[] = [
  {
    key: 'ai',
    label: 'AI',
    variants: ['ai', 'เอไอ', 'ปัญญาประดิษฐ์'],
  },
  {
    key: 'ประยุกต์ใช้',
    label: 'ประยุกต์ใช้',
    variants: ['ประยุกต์ใช้', 'นำไปใช้', 'นำไปประยุกต์ใช้', 'เอาไปใช้'],
  },
  {
    key: 'สร้างสรรค์',
    label: 'สร้างสรรค์',
    variants: ['สร้างสรรค์', 'ความคิดสร้างสรรค์', 'คิดสร้างสรรค์'],
  },
] as const;
