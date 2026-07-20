'use client'

import { useState, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FormLogin({ className }: { className?: string }) {
  // Refs
  const formRef = useRef<HTMLFormElement>(null)

  // Hooks
  const router = useRouter()
  const { push: redirect } = router

  // State
  const [state, setState] = useState({
    message: '',
    success: false,
    errors: {
      email: '',
      password: '',
    },
  })
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setPending(true)

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
      setPending(false)
      return
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      // console.log('res: ', res)

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
          redirect('/dashboard')
        }, 1000)

        //
      } else {
        setState({
          message: 'Failed to login',
          success: false,
          errors: {
            email: '',
            password: '',
          },
        })
      }

      setPending(false)
    } catch (error) {
      console.log('error: ', error)

      setState({
        message: 'Failed to login',
        success: false,
        errors: {
          email: '',
          password: '',
        },
      })
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className={`${className} flex flex-col gap-5`}
    >
      {/* Header Section */}
      <div className=" text-left flex flex-col gap-2.5">
        <h2 className="text-[#0F0E2E] text-[24px] font-sora non-italic font-bold leading-[28.8px]">
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
        <div className="flex flex-col gap-1.5 w-full px-2.5">
          <label className="font-semibold text-xs  text-gray-700 leading-4">
            Email
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

        <div className="form-control px-2.5">
          {/* Password Field */}
          <label className="font-semibold text-xs  text-gray-700 leading-4">
            Password
          </label>
          <div className="relative w-full">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-xl text-sm transition-all focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100 placeholder:text-slate-400"
            />
            {state?.errors?.password && (
              <p className="error">{state?.errors?.password}</p>
            )}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent p-0"
            >
              <svg
                xmlns="http://w3.org"
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

        <button
          type="submit"
          disabled={pending}
          className="self-stretch h-9 px-3.5 py-3.5 bg-gradient-to-r from-indigo-400 via-violet-400 via-[57%] to-red-400 to-[140%] rounded-md shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08),0px_4px_22px_0px_rgba(112,125,255,0.27)] inline-flex justify-center items-center disabled:animate-pulse disabled:opacity-50 transition-all hover:opacity-95"
        >
          {/* Dynamic Submission Text Logic */}
          <div className="text-center justify-start text-white text-sm font-semibold leading-5 tracking-tight">
            {pending ? 'Please wait...' : 'Sign in →'}
          </div>

          {/* 2. Dynamic Icon Visibility Logic (Hides while loading) */}
          {!pending && (
            <div className="size-3.5 relative overflow-hidden"></div>
          )}
        </button>
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
