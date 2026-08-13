'use client'

import { useState, useRef, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthSubmitButton } from '@/components/ui/AuthSubmitButton'
import { PasswordToggle } from '@/components/ui/PasswordToggle'
import { useAuthFormValidity } from '@/components/forms/useAuthFormValidity'
import { isValidEmail } from '@/lib/helper'

export default function FormLogin({ className }: { className?: string }) {
  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // Hooks
  const [pending, startTransition] = useTransition()
  const { isFormValid, checkFormValidity } = useAuthFormValidity(formRef)

  // State
  const [state, setState] = useState({
    message: '',
    success: false,
    errors: {
      email: '',
      password: '',
    },
  })
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    startTransition(async () => {
      const formData = new FormData(formRef.current)
      const email = formData.get('email')?.toString().trim()
      const password = formData.get('password')?.toString().trim()

      if (!email || !password) {
        setState({
          message: null,
          success: false,
          errors: {
            email: !email ? 'Email is required.' : '',
            password: !password ? 'Password is required.' : '',
          },
        })
        return
      }

      if (!isValidEmail(email)) {
        setState({
          message: null,
          success: false,
          errors: {
            email: 'Please enter a valid email address.',
            password: '',
          },
        })
        return
      }

      try {
        const res = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (res?.ok === true) {
          setState({
            message: 'Logged in successfully',
            success: true,
            errors: {
              email: '',
              password: '',
            },
          })

          // Wait 1 second before redirecting
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        } else {
          setState({
            message: null,
            success: false,
            errors: {
              email: '',
              password: 'Invalid email or password.',
            },
          })
        }
      } catch (error) {
        console.log('error: ', error)

        setState({
          message: null,
          success: false,
          errors: {
            email: '',
            password: 'Invalid email or password.',
          },
        })
      }
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={checkFormValidity}
      noValidate
      className={`${className} flex flex-col gap-4`}
    >
      {/* Header Section */}
      <div className=" text-left flex flex-col gap-2.5">
        <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-normal">
          Login to your account
        </h2>
        <p className="text-gray-500 font-inter text-[13px] non-italic font-medium leading-[20.8px]">
          Enter your email below to login to your account
        </p>
      </div>

      {/* Error/Success Alert Banner */}
      {state?.message && (
        <p
          className={`alert ${
            state.success ? `alert--success` : `alert--danger`
          }`}
        >
          {state?.message}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {/* Email Field */}
        <AuthInput
          label="Email"
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
          placeholder="Enter your password"
          error={state?.errors?.password}
          required
        >
          <PasswordToggle
            shown={showPassword}
            onToggle={() => setShowPassword((shown) => !shown)}
          />
        </AuthInput>

        {/* 4. Remember Me & Forgot Password Links Row */}
        <div className="flex items-center justify-between mt-1 text-sm">
          <label className="flex items-center gap-2 text-slate-500 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              name="remember"
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-500"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <AuthSubmitButton
          pending={pending}
          label="Sign in →"
          disabled={!isFormValid}
        />
      </div>

      {/* Footer Registration Navigation link */}
      <div className="mt-2 text-center text-sm text-slate-500 font-medium">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-indigo-400 hover:text-indigo-500 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    </form>
  )
}
