import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ProtectedRoute } from './ProtectedRoute';

interface ProtectedWithOnboardingProps {
  children: React.ReactNode;
}

export function ProtectedWithOnboarding({ children }: ProtectedWithOnboardingProps) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    
    if (!onboardingComplete && location !== '/onboarding') {
      setLocation('/onboarding');
    }
  }, [location, setLocation]);

  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
