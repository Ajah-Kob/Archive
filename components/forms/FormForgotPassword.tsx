'use client'

import { useState, useRef, useActionState } from 'react'
import { forgotPassword } from '@/lib/actions/util'
import { AuthInput } from '@/components/ui/AuthInput'

export default function FormForgotPassword({
  className,
}: {
  className: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, handleSubmit, isPending] = useActionState(forgotPassword, {
    success: false,
    message: null,
    errors: null,
  })
  const [isFormValid, setIsFormValid] = useState(false)

  function checkFormValidity() {
    const form = formRef.current
    if (!form) return
    const inputs = form.querySelectorAll('input[required]:not([type="hidden"])')
    setIsFormValid(
      Array.from(inputs).every(
        (input) => (input as HTMLInputElement).value.trim() !== ''
      )
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      onInput={checkFormValidity}
      noValidate
      className={`${className} flex flex-col gap-5`}
    >
      <AuthInput
        label="Email"
        name="email"
        type="email"
        placeholder="johnthomas@email.com"
        error={state?.errors?.email}
        required
      />

      {/* Alert */}
      {state && state.message && (
        <div
          className={`alert ${
            state.success ? 'alert--success' : 'alert--danger'
          }`}
        >
          {state.message}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending || !isFormValid}
          className="self-stretch h-9 px-3.5 py-3.5 bg-gradient-to-r from-indigo-400 via-violet-400 via-[57%] to-red-400 to-[140%] rounded-md shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center disabled:animate-pulse disabled:opacity-50 transition-all hover:opacity-95 w-full"
        >
          <div className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
            {isPending ? 'Please wait...' : 'Submit'}
          </div>
        </button>
      </div>
    </form>
  )
}
