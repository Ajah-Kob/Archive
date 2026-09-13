'use client'

import { useEffect, useState, useRef, useActionState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { resetPassword } from '@/lib/actions/util'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthSubmitButton } from '@/components/ui/AuthSubmitButton'
import { PasswordToggle } from '@/components/ui/PasswordToggle'

export default function FormResetPassword({
  className,
}: {
  className: string
}) {
  // Params
  const searchParams = useSearchParams()
  const router = useRouter()

  // Refs
  const formRef = useRef<HTMLFormElement>(null)
  const toastShownRef = useRef(false)

  // State
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)

  const matched = password !== '' && password === confirmPassword
  // A match means the user already fixed whatever the server complained
  // about, so stale errors stay hidden until the next submit.
  const showErrors = !matched

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

  // On success, toast once, lock the form, then send the user to login.
  const [redirecting, setRedirecting] = useState(false)
  useEffect(() => {
    if (!state.success || toastShownRef.current) return
    toastShownRef.current = true
    toast.success(state.message || 'Password reset successful.')
    setRedirecting(true)
    const timer = setTimeout(() => router.push('/login'), 2500)
    return () => clearTimeout(timer)
  }, [state.success, state.message, router])

  // if no token and email return:
  if (!email && !token) {
    return (
      <div className="w-full max-w-[420px] p-6 md:p-8 rounded-3xl bg-[#ffffff] shadow-[0px_4px_24px_0px_rgba(0,0,0,0.03),0px_20px_60px_-4px_rgba(112,125,255,0.16),0px_0px_0px_1px_rgba(112,125,255,0.06)] flex flex-col gap-5">
        <div className="text-left flex flex-col gap-2.5">
          <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-normal">
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
      className={`flex flex-col gap-4 ${className}`}
    >
      {/* Header Section */}
      <div className="text-left flex flex-col gap-1">
        <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-normal">
          Set a new password
        </h2>
        <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
          Create a new password to regain access to your account
        </p>
      </div>

      {/** Hiddens */}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />

      <AuthInput
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="********"
        error={showErrors ? state?.errors?.password : undefined}
        success={matched}
        onChange={(e) => setPassword(e.target.value)}
        required
      >
        <PasswordToggle
          shown={showPassword}
          onToggle={() => setShowPassword((shown) => !shown)}
        />
      </AuthInput>

      <AuthInput
        label="Confirm Password"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        placeholder="********"
        error={showErrors ? state?.errors?.confirmPassword : undefined}
        success={matched}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      >
        <PasswordToggle
          shown={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((shown) => !shown)}
        />
      </AuthInput>

      {/* Match confirmation */}
      {matched && (
        <p className="flex items-center gap-1 text-green-600 text-xs font-medium -mt-2">
          <Check className="size-3.5" /> Passwords match
        </p>
      )}

      {/* Alert */}
      {state.message && showErrors && (
        <div
          className={`alert ${
            state.success ? 'alert--success' : 'alert--danger'
          }`}
        >
          {state.message}
        </div>
      )}

      <AuthSubmitButton
        pending={isPending}
        label={redirecting ? 'Redirecting to login…' : 'Reset Password'}
        disabled={!isFormValid || redirecting}
      />
    </form>
  )
}
