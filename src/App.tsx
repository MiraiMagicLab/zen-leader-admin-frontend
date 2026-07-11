import { AuthProvider } from '@/providers/auth-provider.tsx';
import { AppRouterProvider } from '@/providers/router-provider.tsx';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <AppRouterProvider />
      <Toaster position="top-right" expand visibleToasts={4} />
    </AuthProvider>
  );
}
