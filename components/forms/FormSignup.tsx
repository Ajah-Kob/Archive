'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { signupUser } from '@/lib/actions/user'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeNextPath } from '@/lib/helper'
import Link from 'next/link'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthSubmitButton } from '@/components/ui/AuthSubmitButton'
import { PasswordToggle } from '@/components/ui/PasswordToggle'
import { useAuthFormValidity } from '@/components/forms/useAuthFormValidity'

export default function FormSignup({ className }: { className?: string }) {
  // Hooks
  const { push: redirect } = useRouter()
  const searchParams = useSearchParams()
  // Resume target after signup → login (e.g. /join/<code> from an invite link).
  const next = safeNextPath(searchParams.get('next'))

  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // States
  const [state, handleSubmit, pending] = useActionState(signupUser, {})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { isFormValid, checkFormValidity } = useAuthFormValidity(formRef)

  useEffect(() => {
    if (state?.success && formRef.current) {
      formRef.current.reset()
      // Use delay 1000 to show form message before redirect
      setTimeout(() => {
        redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
      }, 1000)
    }
  }, [state?.success])

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      onInput={checkFormValidity}
      noValidate
      className={`flex flex-col gap-4 ${className ?? ''}`}
    >
      {/* Header Section */}
      <div className="text-left flex flex-col gap-2.5">
        <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-normal">
          Create an account
        </h2>
        <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
          Enter your details below to set up your account
        </p>
      </div>

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
          <PasswordToggle
            shown={showPassword}
            onToggle={() => setShowPassword((shown) => !shown)}
          />
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
          <PasswordToggle
            shown={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((shown) => !shown)}
          />
        </AuthInput>

        {/* Submit Button */}
        <AuthSubmitButton
          pending={pending}
          label="Signup →"
          disabled={!isFormValid}
        />
        {/* Footer Registration Navigation link */}
        <div className="mt-2 text-center text-sm text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </form>
  )
}
