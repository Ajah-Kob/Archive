'use client';

import React from 'react';
import { 
  Menu, 
  Flag, 
  ShieldCheck, 
  Calendar, 
  Archive, 
  User, 
  Bell 
} from 'lucide-react';

export const DefenseSideBar: React.FC = () => {
  return (
    <aside className="w-16 bg-white border-r border-slate-100 flex flex-col justify-between items-center py-4 h-screen sticky top-0 z-20">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-6 w-full">
        <button 
          type="button" 
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Menu size={20} />
        </button>

        <nav className="flex flex-col items-center gap-5 w-full mt-2">
          <button type="button" className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <Flag size={20} />
          </button>
          <button type="button" className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <ShieldCheck size={20} />
          </button>
          <button type="button" className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <Calendar size={20} />
          </button>
          <button type="button" className="p-2.5 text-indigo-600 bg-indigo-50/60 rounded-xl transition-colors">
            <Archive size={20} />
          </button>
          <button type="button" className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            <User size={20} />
          </button>
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-4 w-full">
        <button type="button" className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>
        
        {/* User Profile Avatar Circle */}
        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-sm">
          MS
        </div>
      </div>
    </aside>
  );
};

export default DefenseSideBar;