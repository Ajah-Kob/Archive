import { type ChapterVersionItem } from '@/types/milestones'
import { FileText, Eye } from 'lucide-react'

interface SubmissionVersionRowProps {
  version: ChapterVersionItem
  isLast: boolean
  isFirst: boolean
}

export function SubmissionVersionRow({ version, isLast, isFirst }: SubmissionVersionRowProps) {
  const pillColors = {
    APPROVED: 'bg-[rgba(22,163,74,0.07)] text-[#16a34a]',
    NEEDS_REVISION: 'bg-[rgba(245,158,11,0.07)] text-[#f59e0b]',
    IN_REVIEW: 'bg-[#f4f5fc] text-[#5a6382]',
    SUPERSEDED: 'bg-[#f4f5fc] text-[#5a6382]',
  }[version.status]

  return (
    <div className='flex gap-4'>
      <div className='flex flex-col items-center'>
        <div className={`size-[15px] rounded-[25px] border-2 bg-white ${version.status === 'IN_REVIEW' ? 'rounded-[50%]' : ''} ${version.isCurrent ? 'border-[#707dff]' : 'border-[#e0e3f0]'}`} />
        {!isLast && <div className={`w-[2px] flex-1 bg-[#e8ebf8] ${version.status === 'IN_REVIEW' ? 'border-l-2 border-dashed border-[#e8ebf8] bg-transparent' : ''}`} />}
      </div>
      <div className='flex-1 pb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h4 className='font-sora text-[13px] font-semibold text-[#1e3a8a]'>Version {version.version}</h4>
            <p className='text-[12px] text-[#6b7399]'>{new Date(version.submittedAt).toLocaleDateString()}</p>
          </div>
          <a href={version.blobUrl} target='_blank' rel='noopener noreferrer' className='flex h-[32px] w-[74px] items-center justify-center gap-1 rounded-[8px] border border-[#e0e3f0] bg-[#f0f2fa] text-[12px] font-medium text-[#5a6382]'>
            <Eye className='size-[14px]' /> View
          </a>
        </div>
        <div className='mt-2 flex items-center justify-between'>
          <p className='text-[12px] text-[#9ea8c6]'>4 comments on 3 pages · Reviewed {version.reviewedAt ? new Date(version.reviewedAt).toLocaleDateString() : 'N/A'}</p>
          <span className={`rounded-[7px] px-[9px] py-[2px] text-[11px] font-bold ${pillColors}`}>
            {version.status}
          </span>
        </div>
      </div>
    </div>
  )
}

interface SubmissionHistoryProps {
  history: ChapterVersionItem[]
}

export function SubmissionHistory({ history }: SubmissionHistoryProps) {
  return (
    <div className='overflow-hidden rounded-[14px] border border-[#eceef8] bg-white shadow-[0px_2px_12px_0px_rgba(112,125,255,0.06),0px_1px_3px_0px_rgba(0,0,0,0.04)]'>
      <div className='flex items-center justify-between gap-[12px] px-[16px] py-[14px] border-b border-[#f0f2fa]'>
        <h3 className='font-sora text-[12.5px] font-semibold text-[#1e3a8a]'>Submission History</h3>
      </div>
      {history.length === 0 ? (
        <div className='flex flex-col items-center gap-3 px-[16px] py-[28px] text-center'>
          <div className='flex size-[48px] items-center justify-center rounded-[24px] bg-[#f4f5fc]'>
            <FileText className='size-[24px] text-[#707dff]' />
          </div>
          <p className='font-sora text-[13px] font-semibold text-[#1e3a8a]'>No Submission History</p>
          <p className='text-[11.5px] text-[#9ea8c6]'>Uploaded documents will appear here once you submit a file.</p>
        </div>
      ) : (
        <div className='flex flex-col px-[16px] py-[16px]'>
          {history.map((v, i) => (
            <SubmissionVersionRow key={v.id} version={v} isFirst={i === 0} isLast={i === history.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
