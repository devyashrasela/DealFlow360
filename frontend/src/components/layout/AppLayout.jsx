import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { TopHeader } from './TopHeader.jsx';

export const AppLayout = ({ onRefresh, isRefreshing }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F3F2F2]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopHeader onRefresh={onRefresh} isRefreshing={isRefreshing} />
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
