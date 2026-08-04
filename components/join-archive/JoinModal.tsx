'use client'

import {
  createContext,
  useContext,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { ArrowRight, Loader2, TriangleAlert, X } from 'lucide-react'

// ─── Context ──────────────────────────────────────────────────────────────────

interface JoinModalContextValue {
  code: string
  setCode: (v: string) => void
  error: string | null
  setError: (v: string | null) => void
  isPending: boolean
  setIsPending: (v: boolean) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
}

const JoinModalContext = createContext<JoinModalContextValue | null>(null)

export function useJoinModal() {
  const ctx = useContext(JoinModalContext)
  if (!ctx)
    throw new Error(
      'JoinModal compound components must be used within JoinModal.Provider',
    )
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface JoinModalProviderProps {
  children: ReactNode
  action: (fd: FormData) => Promise<{ success: boolean; message: string }>
  onSuccess: () => void
}

function JoinModalProvider({
  children,
  action,
  onSuccess,
}: JoinModalProviderProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const enteredCode = formData.get('code')?.toString().trim() ?? ''
    if (!enteredCode) return

    setIsPending(true)
    const res = await action(formData)
    setIsPending(false)

    if (!res.success) {
      setError(res.message)
      return
    }

    onSuccess()
  }

  return (
    <JoinModalContext.Provider
      value={{
        code,
        setCode,
        error,
        setError,
        isPending,
        setIsPending,
        handleSubmit,
      }}
    >
      {children}
    </JoinModalContext.Provider>
  )
}

// ─── Frame ────────────────────────────────────────────────────────────────────

function JoinModalFrame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(16,19,58,0.3)] backdrop-blur-[4px]">
      <div className="relative bg-white border border-[#eceef8] rounded-[16px] w-[420px] p-[29px] shadow-[0px_24px_64px_0px_rgba(16,20,58,0.16),0px_4px_16px_0px_rgba(0,0,0,0.06)] flex flex-col items-start">
        {children}
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function JoinModalHeader({
  title,
  description,
  onClose,
}: {
  title: string
  description: string
  onClose: () => void
}) {
  return (
    <>
      <div className="flex flex-col items-start w-full">
        <p className="font-['Sora',sans-serif] font-bold text-[17px] leading-[25.5px] text-[#12143a] tracking-[-0.17px]">
          {title}
        </p>
        <p className="font-['Plus_Jakarta_Sans'] font-medium text-[13px] leading-[20.15px] text-[#8a93b4] pt-[7px] w-full">
          {description}
        </p>
      </div>

      <button
        onClick={onClose}
        className="absolute top-[18px] right-[18px] size-[28px] bg-[#fafbff] border border-[#eceef8] rounded-[14px] flex items-center justify-center cursor-pointer"
      >
        <X size={13} className="text-[#8a93b4]" />
      </button>
    </>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

function JoinModalInput({ formId }: { formId: string }) {
  const { code, setCode, error, setError, handleSubmit } = useJoinModal()

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="flex flex-col items-start w-full pt-[22px]"
    >
      <div className="pb-[7px]">
        <label className="font-['Plus_Jakarta_Sans', sans-serif] font-bold text-[12.5px] leading-[18.75px] text-[#3c4268] tracking-[0.125px]">
          Invitation Code
        </label>
      </div>
      <input
        value={code}
        onChange={(e) => {
          setCode(e.target.value)
          if (error) setError(null)
        }}
        placeholder="Enter or paste code here"
        className={`w-full h-[42.25px] bg-white border rounded-[9px] px-[15px] py-[11px] text-[13.5px] tracking-[0.27px] font-['Plus_Jakarta_Sans', sans-serif] font-medium outline-none ${
          error
            ? 'border-[rgba(254,111,111,0.5)] text-[#12143a]'
            : 'border-[rgba(214,217,241,0.91)] text-[#12143a]'
        }`}
      />
      {error && (
        <div className="flex gap-[6px] items-start pt-[8px] w-full">
          <TriangleAlert size={13} className="text-[#fe6f6f] shrink-0 mt-px" />
          <p className="font-medium text-[12px] leading-[17.4px] text-[#fe6f6f]">
            {error}
          </p>
        </div>
      )}
    </form>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function JoinModalFooter({
  children,
  onCancel,
}: {
  children: ReactNode
  onCancel: () => void
}) {
  return (
    <div className="flex gap-[10px] items-start pt-[20px] w-full">
      <button
        className="flex-1 bg-white border border-[#dddff0] rounded-[9px] py-[11px] text-center font-semibold text-[13.5px] text-[#5a6382] cursor-pointer"
        onClick={onCancel}
      >
        Cancel
      </button>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ─── Submit Button ────────────────────────────────────────────────────────────

function JoinModalSubmitButton({
  formId,
  label,
  color = 'indigo',
}: {
  formId: string
  label: string
  color?: 'red' | 'indigo'
}) {
  const { code, isPending } = useJoinModal()

  const gradient =
    color === 'red'
      ? 'bg-gradient-to-br from-red-400 to-red-500'
      : 'bg-gradient-to-br from-indigo-400 to-indigo-500'

  return (
    <button
      type="submit"
      form={formId}
      disabled={isPending || !code.trim()}
      className={`flex items-center justify-center gap-[8px] w-full py-[11px] rounded-[9px] text-[13.5px] font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${gradient} shadow-[0px_4px_14px_0px_rgba(112,125,255,0.30)]`}
    >
      {isPending ? 'Joining...' : label}
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ArrowRight size={14} />
      )}
    </button>
  )
}

// ─── Compound export ──────────────────────────────────────────────────────────

export const JoinModal = {
  Provider: JoinModalProvider,
  Frame: JoinModalFrame,
  Header: JoinModalHeader,
  Input: JoinModalInput,
  Footer: JoinModalFooter,
  SubmitButton: JoinModalSubmitButton,
}
