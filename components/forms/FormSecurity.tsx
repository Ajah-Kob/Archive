'use client'

import { useEffect, useRef, useActionState } from 'react'
import { updateMePassword } from '@/lib/actions/me'
import { toast } from 'sonner'

export default function FormSecurity({ className }: { className?: string }) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, handleSubmit, isPending] = useActionState(updateMePassword, {
    success: false,
    message: null,
    errors: null,
  })

  // Success is a toast. One-shot guard: useActionState keeps the returned
  // object in state after the action settles, so without the ref the toast
  // would re-fire on every subsequent re-render of this form.
  const successToastRef = useRef(false)
  useEffect(() => {
    if (!state.success || successToastRef.current) return
    successToastRef.current = true
    toast.success(state.message || 'Password updated successfully.')
  }, [state.success, state.message])

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className={`bg-white border border-[#eceef8] rounded-[14px] p-4 sm:p-6 md:p-8 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] mx-auto flex justify-center ${className}`}
      noValidate
      data-loading={isPending}
    >
      <div className="form__content">
        <div className=" flex flex-col gap-5">
          <div className="form-control">
            <label htmlFor="current_password">Current Password*</label>
            <div className="relative w-full ">
              <input
                required
                name="current_password"
                type="password"
                className={`w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  state.errors?.current_password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : ''
                }`}
                placeholder="**************"
              />
            </div>
            {/* Field Alert */}
            {state.errors?.current_password && (
              <div className="error">{state.errors.current_password}</div>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="new_password">New Password*</label>
            <div className="relative w-full ">
              <input
                required
                name="new_password"
                type="password"
                className={`w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  state.errors?.new_password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : ''
                }`}
                placeholder="**************"
              />
            </div>
            {/* Field Alert */}
            {state.errors?.new_password && (
              <div className="error">{state.errors.new_password}</div>
            )}
          </div>

          <div className="form-control">
            <label htmlFor="confirm_password">Confirm Password*</label>
            <div className="relative w-full ">
              <input
                required
                name="confirm_password"
                type="password"
                className={`w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors ${
                  state.errors?.confirm_password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                    : ''
                }`}
                placeholder="**************"
              />
            </div>
            {/* Field Alert */}
            {state.errors?.confirm_password && (
              <div className="error">{state.errors.confirm_password}</div>
            )}
          </div>

          {/* Errors only — success is a toast. */}
          {state.message && !state.success && (
            <div className="alert alert--danger">{state.message}</div>
          )}

          <button
            type="submit"
            className={`button button--accent flex justify-center ${
              isPending ? 'cursor-wait opacity-50' : 'cursor-pointer'
            }`}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
