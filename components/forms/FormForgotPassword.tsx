'use client'

import { useEffect, useRef, useState, useActionState } from 'react'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { forgotPassword } from '@/lib/actions/util'
import { isValidEmail } from '@/lib/helper'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthSubmitButton } from '@/components/ui/AuthSubmitButton'

export default function FormForgotPassword({
  className,
}: {
  className: string
}) {
  const [state, handleSubmit, isPending] = useActionState(forgotPassword, {
    success: false,
    message: null,
    errors: null,
  })

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const toastShownRef = useRef(false)

  const emailValid = isValidEmail(email)

  // Returning to this page (including back-forward cache restores, which
  // skip remounting) must always show a fresh form.
  useEffect(() => {
    const resetForm = () => {
      setEmail('')
      setSubmitted(false)
      toastShownRef.current = false
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetForm()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // After a completed submit: toast once and lock the form in its sent state.
  useEffect(() => {
    if (isPending || state.message == null || toastShownRef.current) return
    toastShownRef.current = true
    if (state.success) {
      toast.success(state.message)
      setSubmitted(true)
    } else {
      toast.error(state.message)
    }
  }, [isPending, state.message, state.success])

  return (
    <form
      action={handleSubmit}
      noValidate
      className={`${className} flex flex-col gap-4`}
    >
      {/* Header Section */}
      <div className="text-left flex flex-col gap-1">
        <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-normal">
          Forgot your password?
        </h2>
        <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <AuthInput
        label="Email"
        name="email"
        type="email"
        placeholder="johnthomas@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={!submitted ? state?.errors?.email : undefined}
        success={submitted}
        disabled={submitted}
        required
      />

      {/* Sent confirmation */}
      {submitted && (
        <p className="flex items-center gap-1 text-green-600 text-xs font-medium -mt-2">
          <Check className="size-3.5" /> Reset link sent — please check your
          inbox.
        </p>
      )}

      <AuthSubmitButton
        pending={isPending}
        label="Send Reset Link"
        disabled={!emailValid || isPending || submitted}
      />
    </form>
  )
}
