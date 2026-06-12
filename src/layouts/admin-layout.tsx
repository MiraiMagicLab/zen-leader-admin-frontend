import { Outlet } from 'react-router-dom';

import { AdminSidebar } from '@/components/ui/admin-sidebar';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0">
        <DashboardHeader />
        <div className="admin-shell flex w-full min-w-0 flex-1 flex-col p-4 pt-0 md:p-6">
          <div className="mx-auto w-full max-w-7xl flex-1 pb-2">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
