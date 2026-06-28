export const EMOJI_OPTIONS = [
  { id: 'love', emoji: '🥰', label: 'รัก' },
  { id: 'wow', emoji: '🤩', label: 'ว้าว' },
  { id: 'excited', emoji: '😃', label: 'ตื่นเต้น' },
  { id: 'fun', emoji: '😂', label: 'สนุกสนาน' },
  { id: 'okay', emoji: '😌', label: 'โอเค' },
  { id: 'bored', emoji: '😒', label: 'เบื่อ' },
  { id: 'dissatisfied', emoji: '🙁', label: 'ไม่ค่อยพอใจ' },
  { id: 'angry', emoji: '😡', label: 'โกรธ' },
] as const;

export const EMOJI_IDS = EMOJI_OPTIONS.map((option) => option.id) as [
  'love',
  'wow',
  'excited',
  'fun',
  'okay',
  'bored',
  'dissatisfied',
  'angry',
];

export type EmojiId = (typeof EMOJI_OPTIONS)[number]['id'];

export function getEmojiOption(id: EmojiId) {
  return EMOJI_OPTIONS.find((option) => option.id === id)!;
}
