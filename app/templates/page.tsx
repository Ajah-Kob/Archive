'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  MoreVertical, 
  AlertCircle, 
  FolderOpen,
  ChevronRight,
  ChevronDown,
  X,
  UploadCloud
} from 'lucide-react';
import DefenseSideBar from '@/components/ui/DefenseSideBar';
import SearchBar from '@/components/ui/Searchbar';

// TODO: Replace this mock import with your actual Auth hook/context
// Example: import { useSession } from 'next-auth/react'; 
// or import { useAuth } from '@/context/AuthContext';

export type UserRole = 'student' | 'faculty';

export interface TemplateItem {
  id: number;
  name: string;
  category: string;
  dateUploaded: string;
  uploadedBy: string;
  size: string;
  fileUrl: string;
}

const INITIAL_TEMPLATES: TemplateItem[] = [
  { id: 1, name: 'Capstone1ChapterTemplate.docx', category: 'Templates', dateUploaded: 'Jan 10, 2026', uploadedBy: 'Coordinator', size: '1.2 MB', fileUrl: '#' },
  { id: 2, name: 'TitlePageFormatGuide.pdf', category: 'Guides', dateUploaded: 'Jan 10, 2026', uploadedBy: 'Coordinator', size: '0.4 MB', fileUrl: '#' },
  { id: 3, name: 'ManuscriptStyleGuide.pdf', category: 'Guides', dateUploaded: 'Jan 10, 2026', uploadedBy: 'Coordinator', size: '2.1 MB', fileUrl: '#' },
  { id: 4, name: 'Capstone2ChapterTemplate.docx', category: 'Templates', dateUploaded: 'Jan 10, 2026', uploadedBy: 'Coordinator', size: '1.2 MB', fileUrl: '#' },
  { id: 5, name: 'ReferencesAndCitationsFormat.pdf', category: 'Guides', dateUploaded: 'Feb 3, 2026', uploadedBy: 'Prof. Juan Dela Cruz', size: '0.8 MB', fileUrl: '#' },
  { id: 6, name: 'ProposalDefenseEvaluationForm.pdf', category: 'Forms', dateUploaded: 'Mar 1, 2026', uploadedBy: 'Coordinator', size: '0.6 MB', fileUrl: '#' },
  { id: 7, name: 'ProposalManuscriptTemplate.docx', category: 'Templates', dateUploaded: 'Mar 1, 2026', uploadedBy: 'Coordinator', size: '1.5 MB', fileUrl: '#' },
];

const CATEGORIES: string[] = ['All Category', 'Templates', 'Guides', 'Forms'];

export default function TemplatesPage() {
  // TODO: connect backend here - fetch authenticated user session/context
  // Example implementation:
  // const { data: session } = useSession();
  // const userRole: UserRole = session?.user?.role || 'student';
  
  // Mocking account role derived from login context (If u want to check change to 'student' or 'faculty' to test account behavior if it works)
  const [currentUser] = useState<{ name: string; role: UserRole }>({
    name: 'Prof. Juan Dela Cruz',
    role: 'faculty', // Automatically populated from account sign-in/JWT
  });

  const userRole = currentUser.role;

  const [templates, setTemplates] = useState<TemplateItem[]>(INITIAL_TEMPLATES);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Category');
  const [error] = useState<string | null>(null);

  // Popover menu state
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Upload Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('Templates');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Click outside listener for action dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderFileIcon = (filename: string): React.ReactElement => {
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    return (
      <div 
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
        }`}
      >
        <FileText size={18} />
      </div>
    );
  };

  const filteredTemplates = useMemo<TemplateItem[]>(() => {
    return templates.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All Category' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, selectedCategory]);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // TODO: connect backend here - post template to endpoint (POST /api/templates)
  const handleConfirmUpload = () => {
    if (!selectedFile) return;

    const newTemplate: TemplateItem = {
      id: Date.now(),
      name: selectedFile.name,
      category: uploadCategory,
      dateUploaded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      uploadedBy: currentUser.name, // Uses the logged-in user's account name
      size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      fileUrl: '#',
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    setIsUploadModalOpen(false);
    setSelectedFile(null);
  };

  const handleViewFile = (file: TemplateItem) => {
    setActiveMenuId(null);
    if (file.fileUrl && file.fileUrl !== '#') {
      window.open(file.fileUrl, '_blank');
    } else {
      alert(`Viewing ${file.name}`);
    }
  };

  // TODO: connect backend here - remove file handler (DELETE /api/templates/:id)
  const handleRemoveFile = (file: TemplateItem) => {
    setActiveMenuId(null);
    if (confirm(`Are you sure you want to remove ${file.name}?`)) {
      setTemplates((prev) => prev.filter((item) => item.id !== file.id));
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <DefenseSideBar />

      <main className="flex-1 p-8 md:p-12 overflow-y-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                <span>ARCHIVE</span>
                <ChevronRight size={12} />
                <span className="text-indigo-600">Defense</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Templates
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                View, manage, and download document templates for faculty and students.
              </p>
            </div>
          </div>

          {/* ------------------- ROLE-BASED TOOLBARS ------------------- */}
          
          {/* FACULTY TOOLBAR (With Upload Button) */}
          {userRole === 'faculty' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto flex-1">
                <div className="w-full sm:max-w-md">
                  <SearchBar 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="relative w-full sm:w-44">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Upload Button rendered exclusively for Faculty account session */}
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Upload size={16} />
                <span>Upload Template</span>
              </button>
            </div>
          )}

          {/* STUDENT TOOLBAR (Standard View) */}
          {userRole === 'student' && (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex-1 w-full">
                <SearchBar 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative w-full sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-visible">
            {error ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-800">Failed to Load Templates</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">{error}</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-3">
                  <FolderOpen size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-800">No templates found</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  We couldn't find any documents matching your current search or category filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">NAME</th>
                      <th className="py-4 px-6">DATE UPLOADED</th>
                      <th className="py-4 px-6">UPLOADED BY</th>
                      <th className="py-4 px-6">SIZE</th>
                      <th className="py-4 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTemplates.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {renderFileIcon(file.name)}
                            <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {file.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                          {file.dateUploaded}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-semibold">
                              {file.uploadedBy.charAt(0)}
                            </div>
                            <span className="text-slate-600 font-medium text-xs">{file.uploadedBy}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-slate-400 font-medium text-xs">
                          {file.size}
                        </td>

                        <td className="py-4 px-6 text-right relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === file.id && (
                            <div 
                              ref={menuRef}
                              className="absolute right-6 top-12 z-30 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 text-left animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => handleViewFile(file)}
                                className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left flex items-center gap-2"
                              >
                                View File
                              </button>
                              
                              {/* Only Faculty account sessions see the "Remove File" action */}
                              {userRole === 'faculty' && (
                                <>
                                  <div className="h-[1px] bg-slate-100 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(file)}
                                    className="w-full px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors text-left flex items-center gap-2"
                                  >
                                    Remove File
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ------------------- UPLOAD MODAL ------------------- */}
      {isUploadModalOpen && userRole === 'faculty' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload Template</h3>
                <p className="text-xs text-slate-500">Select a category and upload a document file.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Target Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {CATEGORIES.filter(c => c !== 'All Category').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Drag & Drop File Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : selectedFile 
                  ? 'border-emerald-500 bg-emerald-50/30' 
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx"
              />

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <UploadCloud size={24} />
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-indigo-600 underline">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PDF or Word documents (MAX. 10MB)</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedFile}
                onClick={handleConfirmUpload}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:active:scale-100"
              >
                Upload File
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}