import type { InputHTMLAttributes, ReactNode } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  type?: string
  placeholder?: string
  error?: string
  icon?: ReactNode
  children?: ReactNode
}

export function AuthInput({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  icon,
  children,
  required,
  className,
  ...rest
}: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label
        htmlFor={name}
        className="text-[13px] font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative w-full">
        {icon && (
          <div className="w-11 h-full flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-10 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className={`w-full py-3 bg-[#F7F7F8] border rounded-xl text-sm font-normal text-[#0F0E2E] leading-6 transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-[#939393] placeholder:text-sm placeholder:leading-6 placeholder:font-normal ${
            icon ? 'pl-11' : 'pl-4'
          } ${children ? 'pr-11' : 'pr-4'} ${
            error
              ? 'border-red-500/50 ring-2 ring-red-500/20'
              : 'border-[#E3E3E3] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
          }${className ? ` ${className}` : ''}`}
          {...rest}
        />
        {children && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
            {children}
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-0.5">{error}</p>
      )}
    </div>
  )
}
