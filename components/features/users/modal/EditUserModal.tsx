'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { updateUser } from '@/lib/actions/user'
import type { UserItem } from '@/components/features/users/main/UsersTable'

interface EditUserModalProps {
  user: UserItem | null
  onClose: () => void
  onSuccess: () => void
}

export default function EditUserModal({
  user,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const [formErrors, setFormErrors] = React.useState<Record<
    string,
    string
  > | null>(null)
  const [formMessage, setFormMessage] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setFormErrors(null)
    setFormMessage(null)

    const formData = new FormData(e.currentTarget)
    const result: any = await updateUser(null, formData)

    if (result.success) {
      toast.success('User updated successfully')
      onSuccess()
      onClose()
    } else {
      setFormErrors(result.errors || null)
      setFormMessage(result.message || null)
    }
    setIsPending(false)
  }

  if (!user) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
            <p className="text-xs text-slate-500">
              Update user account details.
            </p>
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
          <input type="hidden" name="id" value={user.id} />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Name</label>
            <input
              type="text"
              name="name"
              defaultValue={user.name}
              required
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {formErrors?.name && (
              <p className="text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              defaultValue={user.email}
              required
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {formErrors?.email && (
              <p className="text-xs text-red-500">{formErrors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Role</label>
            <select
              name="role"
              defaultValue={user.role}
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
              disabled={isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:active:scale-100"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
