import { AuthProvider } from '@/providers/auth-provider.tsx';
import { AppRouterProvider } from '@/providers/router-provider.tsx';

export default function App() {
  return (
    <AuthProvider>
      <AppRouterProvider />
    </AuthProvider>
  );
}
