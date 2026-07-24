'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { signupUser } from '@/lib/actions/user'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FormSignup({ className }: { className?: string }) {
  // Hooks
  const { push: redirect } = useRouter()

  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // States
  const [state, handleSubmit, pending] = useActionState(signupUser, {})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
        <div className="form-control px-2.5">
          <label className="font-semibold text-xs text-gray-700 leading-4">
            Full name
          </label>
          <input
            required
            type="text"
            name="name"
            placeholder="John Thomas"
            className="w-full px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-xl text-sm transition-all focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 placeholder:text-slate-400"
          />
          {state?.errors?.name && (
            <p className="error">{state?.errors?.name}</p>
          )}
        </div>

        {/* Email Address Field */}
        <div className="form-control px-2.5">
          <label className="font-semibold text-xs text-gray-700 leading-4">
            Email address
          </label>
          <input
            required
            type="email"
            name="email"
            placeholder="johnthomas@email.com"
            className="w-full px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-xl text-sm transition-all focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 placeholder:text-slate-400"
          />
          {state?.errors?.email && (
            <p className="error">{state?.errors?.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="form-control px-2.5">
          <label className="font-semibold text-xs text-gray-700 leading-4">
            Password
          </label>
          <div className="relative w-full">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your Password"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-xl text-sm transition-all focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent p-0"
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
          </div>
          {state?.errors?.password && (
            <p className="text-xs font-medium text-rose-600 mt-0.5">
              {state?.errors?.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="form-control px-2.5">
          <label className="font-semibold text-xs text-gray-700 leading-4">
            Confirm password
          </label>
          <div className="relative w-full">
            <input
              required
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm your Password"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-xl text-sm transition-all focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent p-0"
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
          </div>
          {state?.errors?.confirmPassword && (
            <p className="text-xs font-medium text-rose-600 mt-0.5">
              {state?.errors?.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="px-2.5">
          <button
            type="submit"
            disabled={pending}
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
