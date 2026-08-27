import * as SecureStore from '@/utils/secure-store';
import { useCallback, useEffect, useState } from 'react';

const ONBOARDING_KEY = 'iptv_onboarding_completed';

export function useOnboarding() {
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        checkOnboarding();
    }, []);

    const checkOnboarding = async () => {
        try {
            const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
            setHasSeenOnboarding(value === 'true');
        } catch {
            setHasSeenOnboarding(false);
        }
    };

    const completeOnboarding = useCallback(async () => {
        try {
            await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
            setHasSeenOnboarding(true);
        } catch {
            // silently fail
        }
    }, []);

    const resetOnboarding = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync(ONBOARDING_KEY);
            setHasSeenOnboarding(false);
        } catch {
            // silently fail
        }
    }, []);

    return { hasSeenOnboarding, completeOnboarding, resetOnboarding };
}
