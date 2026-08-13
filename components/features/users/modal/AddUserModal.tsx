'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createUser } from '@/lib/actions/user'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [formErrors, setFormErrors] = React.useState<Record<string, string> | null>(null)
  const [formMessage, setFormMessage] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)
  const [nameVal, setNameVal] = React.useState('')
  const [emailVal, setEmailVal] = React.useState('')
  const [passwordVal, setPasswordVal] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const isValid = nameVal.trim() && emailVal.trim() && passwordVal.trim()

  const resetForm = React.useCallback(() => {
    setNameVal('')
    setEmailVal('')
    setPasswordVal('')
    setFormErrors(null)
    setFormMessage(null)
  }, [])

  React.useEffect(() => {
    if (isOpen) resetForm()
  }, [isOpen, resetForm])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setFormErrors(null)
    setFormMessage(null)

    const formData = new FormData(e.currentTarget)
    const result: any = await createUser(null, formData)

    if (result.success) {
      toast.success('User created successfully')
      onSuccess()
      onClose()
    } else {
      setFormErrors(result.errors || null)
      const msg = Array.isArray(result.message)
        ? result.message.join(' ')
        : result.message || null
      setFormMessage(msg)
    }
    setIsPending(false)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Add User</h3>
            <p className="text-xs text-slate-500">Create a new user account.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Name</label>
            <input
              type="text"
              name="name"
              required
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {formErrors?.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              required
              value={emailVal}
              onChange={e => setEmailVal(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {formErrors?.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={passwordVal}
                onChange={e => setPasswordVal(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formErrors?.password && <p className="text-xs text-red-500">{formErrors.password}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Role</label>
            <select
              name="role"
              defaultValue="GUEST"
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="GUEST">Guest</option>
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Superadmin</option>
            </select>
          </div>

          {formMessage && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {formMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:active:scale-100"
            >
              {isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
