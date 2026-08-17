import { FileClock, XCircle, CheckCircle2 } from 'lucide-react'

interface StatusCalloutProps {
  status: 'PENDING' | 'NEED_REVISION' | 'APPROVED'
  message: string
  onAction?: () => void
  actionLabel?: string
}

export function StatusCallout({ status, message, onAction, actionLabel }: StatusCalloutProps) {
  const config = {
    PENDING: {
      bg: 'bg-[rgba(245,158,11,0.07)]',
      border: 'border-[rgba(245,158,11,0.2)]',
      iconBg: 'bg-[rgba(245,158,11,0.08)]',
      iconBorder: 'border-[rgba(245,158,11,0.19)]',
      text: 'text-[#f59e0b]',
      Icon: FileClock,
    },
    NEED_REVISION: {
      bg: 'bg-[rgba(225,29,72,0.07)]',
      border: 'border-[rgba(225,29,72,0.2)]',
      iconBg: 'bg-[rgba(225,29,72,0.08)]',
      iconBorder: 'border-[rgba(225,29,72,0.19)]',
      text: 'text-[#e11d48]',
      Icon: XCircle,
    },
    APPROVED: {
      bg: 'bg-[rgba(22,163,74,0.07)]',
      border: 'border-[rgba(22,163,74,0.2)]',
      iconBg: 'bg-[rgba(22,163,74,0.08)]',
      iconBorder: 'border-[rgba(22,163,74,0.19)]',
      text: 'text-[#16a34a]',
      Icon: CheckCircle2,
    },
  }[status]

  return (
    <div className={`flex items-center px-[22px] py-[18px] gap-[16px] rounded-[14px] border ${config.bg} ${config.border}`}>
      <div className={`flex size-[40px] items-center justify-center rounded-[12px] border ${config.iconBg} ${config.iconBorder}`}>
        <config.Icon className={`size-[20px] ${config.text}`} />
      </div>
      <div className="flex-1">
        <h4 className={`font-sora text-[15px] font-semibold ${config.text}`}>
          {status === 'PENDING' ? 'Submission in review' : status === 'NEED_REVISION' ? 'Revision requested' : 'Submission approved'}
        </h4>
        <p className="text-[13px] text-[#5a6382]">{message}</p>
      </div>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="rounded-[9px] border border-[rgba(225,29,72,0.4)] bg-[#e11d48] px-[18px] py-[9px] text-[13px] font-medium text-white shadow-[0px_2px_4px_rgba(225,29,72,0.2)] transition-all hover:bg-[#c91a40]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
