'use client'

import SearchBar from '@/components/ui/Searchbar'

interface TemplatesToolbarProps {
  searchTerm: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function TemplatesToolbar({
  searchTerm,
  onSearchChange,
}: TemplatesToolbarProps) {
  return (
    <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06),0_1px_3px_rgba(0,0,0,0.04)] py-[20px] px-[20px] flex flex-col sm:flex-row items-center gap-[15px]">
      <div className="flex-1 w-full">
        <SearchBar
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Search templates..."
        />
      </div>
    </div>
  )
}
