'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { signupUser } from '@/lib/actions/user'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthInput } from '@/components/ui/AuthInput'

export default function FormSignup({ className }: { className?: string }) {
  // Hooks
  const { push: redirect } = useRouter()

  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // States
  const [state, handleSubmit, pending] = useActionState(signupUser, {})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset()
      // Use delay 1000 to show form message before redirect
      setTimeout(() => {
        redirect('/login')
      }, 1000)
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      onInput={checkFormValidity}
      noValidate
      className={`flex flex-col gap-5 ${className ?? ''}`}
    >
      {/* Error/Success Alert Banner */}
      {state?.message && (
        <div
          className={`alert ${
            state.success ? `alert--success` : `alert--danger`
          }`}
        >
          {state?.message}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Full Name Field */}
        <AuthInput
          label="Full name"
          name="name"
          type="text"
          placeholder="John Thomas"
          error={state?.errors?.name}
          required
        />

        {/* Email Address Field */}
        <AuthInput
          label="Email address"
          name="email"
          type="email"
          placeholder="johnthomas@email.com"
          error={state?.errors?.email}
          required
        />

        {/* Password Field */}
        <AuthInput
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your Password"
          error={state?.errors?.password}
          required
        >
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="p-2 text-gray-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </button>
        </AuthInput>

        {/* Confirm Password Field */}
        <AuthInput
          label="Confirm password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Confirm your Password"
          error={state?.errors?.confirmPassword}
          required
        >
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            className="p-2 text-gray-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </button>
        </AuthInput>

        {/* Submit Button */}
        <div className="px-2.5">
          <button
            type="submit"
            disabled={pending || !isFormValid}
            className="self-stretch h-9 px-3.5 py-3.5 bg-gradient-to-r from-indigo-400 via-violet-400 via-[57%] to-red-400 to-[140%] rounded-md shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center disabled:animate-pulse disabled:opacity-50 transition-all hover:opacity-95 w-full my-3"
          >
            <div className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
              {pending ? 'Please wait...' : 'Signup →'}
            </div>
          </button>
        </div>
        {/* Footer Registration Navigation link */}
        <div className="mt-2 text-center text-sm text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </form>
  )
}
