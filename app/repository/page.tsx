'use client'

import { useState } from 'react'
import {
  Search,
  Star,
  X,
  Calendar,
  ChevronDown,
  ExternalLink,
  Users,
} from 'lucide-react'

// Repository items data (can easily be moved to a repositoryData.json file later)
const repositoryItems = [
  {
    id: 1,
    title:
      'ARCHIVE: An Integrated Information System for Process Innovation and Optimization in Academic Research and Capstone Management',
    authors:
      'Aaron Gutierrez • Christian Regalario • Kendall Dungca • Pagtalunan Rayshaun • Icen Santos',
    description:
      'This study presents ARCHIVE, an integrated information system designed to manage and organize academic research and capstone documents. It improves accessibility, search efficiency, and centralized storage for Information Systems students.',
    date: 'Feb 2026',
  },
  {
    id: 2,
    title:
      'Student Attendance Monitoring System Using QR Codes for Classroom and Laboratory Sessions',
    authors:
      'Adrian Santos • Mikaela Reyes • John Carlo Mendoza • Patricia Lim',
    description:
      'This study develops a QR-based attendance system for recording student presence in classroom and laboratory sessions. It aims to reduce manual checking time and improve the accuracy of attendance reports.',
    date: 'Feb 2025',
  },
]

export default function RepositoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Category')
  const [sortBy, setSortBy] = useState('None')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  {
    /*TODO: Connect to Database */
  }

  const filteredItems = repositoryItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.authors.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col flex-1 h-full p-8 bg-[#f8f9fe] gap-6 overflow-y-auto">
      {/* Top Header Title */}
      <h1 className="text-xl font-bold text-[#1e2145]">Repository Page</h1>

      {/* Search & Filter Toolbar Container */}
      <div className="bg-white border border-[#e8ebf8] rounded-[14px] shadow-[0_2px_12px_rgba(30,58,138,0.06)] p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Search Input */}
          <div className="flex-1 min-w-[280px] relative flex items-center">
            <Search size={18} className="absolute left-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, keyword, author, or section..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#f8f9fe] border border-[#e8ebf8] rounded-xl text-sm text-[#1e2145] focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Search size={16} /> Search
          </button>
        </div>

        {/* Filters Row Here */}
      </div>

      {/* Results Header Counter */}
      <div className="flex justify-between items-center text-xs font-bold text-[#9ea8c6] px-1">
        <span>{filteredItems.length} RESULTS</span>
        <span>
          Showing {filteredItems.length} of {repositoryItems.length}
        </span>
      </div>

      {/* List of Repository Cards */}
      <div className="flex flex-col gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border-l-4 border-l-indigo-600 border border-[#e8ebf8] rounded-[14px] p-6 shadow-[0_2px_12px_rgba(30,58,138,0.04)] flex flex-col gap-3 relative"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-bold text-[#1e2145] leading-snug">
                {item.title}
              </h2>
              <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg border border-[#e8ebf8] shrink-0">
                <Star size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#6b7399]">
              <Users size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{item.authors}</span>
            </div>

            <p className="text-xs text-[#6b7399] leading-relaxed">
              {item.description}
            </p>

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#f0f2fa]">
              <span className="text-xs text-[#9ea8c6] flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400 shrink-0" />{' '}
                {item.date}
              </span>
              <button className="px-4 py-2 bg-white border border-[#e8ebf8] hover:bg-slate-50 text-indigo-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors">
                View Paper <ExternalLink size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
