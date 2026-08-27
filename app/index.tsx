import { useAuth } from '@/hooks/use-auth';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Redirect } from 'expo-router';

export default function Index() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const { hasSeenOnboarding } = useOnboarding();

    // Wait for both auth and onboarding status
    if (authLoading || hasSeenOnboarding === null) {
        return null;
    }

    if (isAuthenticated) {
        return <Redirect href="/dashboard" />;
    }

    if (!hasSeenOnboarding) {
        return <Redirect href={'/onboarding' as any} />;
    }

    return <Redirect href="/login" />;
}
