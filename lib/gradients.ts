export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #707dff 0%, #5062f5 60%, #3a52ef 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
  'linear-gradient(135deg, #fe6f6f 0%, #f87c7c 55%, #ff9e9e 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 55%, #0f766e 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 55%, #6d28d9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #e08800 55%, #c47a00 100%)',
] as const

export function pickRandomGradient(): string {
  return AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)]!
}
