'use client'

import { useEffect, useState, useRef, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/actions/util'
import { AuthInput } from '@/components/ui/AuthInput'

export default function FormResetPassword({
  className,
}: {
  className: string
}) {
  // Params
  const searchParams = useSearchParams()

  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // State
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [isFormValid, setIsFormValid] = useState(false)

  const [state, handleSubmit, isPending] = useActionState(resetPassword, {
    success: false,
    message: null,
    errors: null,
  })

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

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')

    if (tokenParam && emailParam) {
      setToken(tokenParam)
      setEmail(emailParam)
    }
  }, [searchParams])

  // if no token and email return:
  if (!email && !token) {
    return (
      <div className="w-full max-w-[340px] p-8 md:p-10 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-6">
        <div className="text-left flex flex-col gap-2.5">
          <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-[28.8px]">
            Invalid reset link
          </h2>
          <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
            Please check your email for the reset password link.
          </p>
        </div>
        <Link
          href="/login"
          className="self-stretch h-9 px-3.5 py-3.5 bg-gradient-to-r from-indigo-400 via-violet-400 via-[57%] to-red-400 to-[140%] rounded-md shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center transition-all hover:opacity-95"
        >
          <span className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
            Go back to Login
          </span>
        </Link>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      onInput={checkFormValidity}
      noValidate
      className={`flex flex-col gap-5 ${className}`}
    >
      <AuthInput
        label="Email"
        name="email"
        type="email"
        value={email}
        readOnly
        required
        className="text-gray-400"
      />

      <AuthInput
        label="Password"
        name="password"
        type="password"
        placeholder="********"
        error={state?.errors?.password}
        required
      />

      <AuthInput
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        placeholder="********"
        error={state?.errors?.confirmpassword}
        required
      />

      {/* Alert */}
      {state.message && (
        <div
          className={`alert ${
            state.success ? 'alert--success' : 'alert--danger'
          }`}
        >
          {state.message}
        </div>
      )}

      {/** Hiddens */}
      <input type="hidden" name="token" value={token} />

      <div>
        <button
          type="submit"
          disabled={isPending || !isFormValid}
          className="self-stretch h-9 px-3.5 py-3.5 bg-gradient-to-r from-indigo-400 via-violet-400 via-[57%] to-red-400 to-[140%] rounded-md shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center disabled:animate-pulse disabled:opacity-50 transition-all hover:opacity-95 w-full"
        >
          <div className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
            {isPending ? 'Please wait...' : 'Reset Password'}
          </div>
        </button>
      </div>
    </form>
  )
}
