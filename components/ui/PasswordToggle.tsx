import { Eye, EyeOff } from 'lucide-react'

interface PasswordToggleProps {
  shown: boolean
  onToggle: () => void
}

export function PasswordToggle({ shown, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="p-2 bg-transparent text-gray-400 hover:text-slate-600 transition-colors cursor-pointer"
    >
      {shown ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  )
}
