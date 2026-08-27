import * as SecureStore from '@/utils/secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

const LEGAL_ACCEPTANCE_KEY = 'albasira_legal_acceptance_version';
const REQUIRED_LEGAL_VERSION = '2026-03-26';

async function loadAcceptedVersion(): Promise<string | null> {
    return await SecureStore.getItemAsync(LEGAL_ACCEPTANCE_KEY);
}

async function persistAcceptedVersion(version: string): Promise<void> {
    await SecureStore.setItemAsync(LEGAL_ACCEPTANCE_KEY, version);
}

export function useLegalAcceptance() {
    const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(() => {
        let cancelled = false;
        setIsLoading(true);
        loadAcceptedVersion()
            .then((v) => { if (!cancelled) setAcceptedVersion(v); })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // Initial load
    useEffect(() => {
        return refresh();
    }, [refresh]);

    // Refresh whenever the current screen regains focus (e.g. returning from /legal)
    useFocusEffect(
        useCallback(() => {
            return refresh();
        }, [refresh])
    );

    const requiredVersion = REQUIRED_LEGAL_VERSION;
    const isAccepted = useMemo(() => acceptedVersion === requiredVersion, [acceptedVersion, requiredVersion]);

    const accept = useCallback(async () => {
        await persistAcceptedVersion(requiredVersion);
        setAcceptedVersion(requiredVersion);
    }, [requiredVersion]);

    return { isLoading, isAccepted, requiredVersion, acceptedVersion, accept, refresh };
}

