// ─── Common ────────────────────────────────────────────────────────────────────
export interface CommonTranslations {
    appName: string;
    appTagline: string;
    getStarted: string;
    skip: string;
    next: string;
    cancel: string;
    confirm: string;
    delete: string;
    save: string;
    add: string;
    yes: string;
    no: string;
    loading: string;
    error: string;
    retry: string;
    seeAll: string;
    search: string;
    noResults: string;
    items: string;
}

// ─── Onboarding ────────────────────────────────────────────────────────────────
export interface OnboardingSlide {
    title: string;
    subtitle: string;
}

export interface OnboardingTranslations {
    slides: [OnboardingSlide, OnboardingSlide, OnboardingSlide];
}

// ─── Login ─────────────────────────────────────────────────────────────────────
export interface LoginTranslations {
    tagline: string;
    providers: string;
    addProvider: string;
    addNew: string;
    activeProvider: string;
    active: string;
    noProviders: string;
    noProvidersHint: string;
    launch: string;
    connecting: string;
    footer: string;
    // Add provider modal
    addProviderTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    urlLabel: string;
    urlPlaceholder: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    saveProvider: string;
    fillAllFields: string;
    // Delete confirm
    deleteProviderTitle: string;
    deleteProviderMsg: string;
    // Connection error
    connectionError: string;
    connectionErrorMsg: string;
    // No provider alert
    noProviderAlert: string;
    noProviderAlertMsg: string;
    // Save provider failure
    saveFailed: string;
    saveFailedMsg: string;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardTranslations {
    welcome: string;
    subscriptionStatus: string;
    activeStatus: string;
    expiredStatus: string;
    expires: string;
    connections: string;
    format: string;
    unlimited: string;
    browse: string;
    liveTV: string;
    movies: string;
    series: string;
    quickActions: string;
    favorites: string;
    watchLater: string;
    settings: string;
    continueWatching: string;
    logout: string;
    logoutConfirmTitle: string;
    logoutConfirmMsg: string;
    providerActive: string;
    noHistory: string;
    featured: string;
    totalWatched: string;
    favoritesTitle: string;
    watchLaterTitle: string;
    noFavorites: string;
    noWatchLater: string;
    removeConfirm: string;
    subscriptionAndConnection: string;
    yourActivity: string;
    serverInfoTitle: string;
    serverTimezone: string;
    serverProtocol: string;
    serverTime: string;
    activityLater: string;
    activityWatched: string;
}

// ─── Content (Live / Movies / Series screens) ─────────────────────────────────
export interface ContentTranslations {
    liveTV: string;
    movies: string;
    series: string;
    allCategories: string;
    searchPlaceholder: string;
    loading: string;
    noResults: string;
    items: string;
    live: string;
    // Details Screen
    play: string;
    cast: string;
    director: string;
    similar: string;
    description: string;
    rating: string;
    duration: string;
    releaseDate: string;
    country: string;
    episodes: string;
    seasons: string;
    season: string;
    saved: string;
    added: string;
}

// ─── Player ───────────────────────────────────────────────────────────────────
export interface PlayerTranslations {
    back: string;
    play: string;
    pause: string;
    subtitles: string;
    noSubtitles: string;
    speed: string;
    nextEpisode: string;
    resume: string;
    retry: string;
    live: string;
    loading: string;
    error: string;
    errorMessage: string;
    volume: string;
}

// ─── Legal (EULA / ToS / DMCA) ────────────────────────────────────────────────
export interface LegalSection {
    heading: string;
    body: string[];
}

export interface LegalTranslations {
    title: string;
    lastUpdatedLabel: string;
    lastUpdatedDate: string;

    eulaTitle: string;
    tosTitle: string;
    dmcaTitle: string;

    sections: {
        scopeAndAcceptance: LegalSection;
        noContentProvided: LegalSection;
        userProvidedContent: LegalSection;
        userResponsibility: LegalSection;
        noAffiliation: LegalSection;
        prohibitedUses: LegalSection;
        thirdPartyServices: LegalSection;
        termination: LegalSection;
        disclaimers: LegalSection;
        limitationOfLiability: LegalSection;
        indemnification: LegalSection;
        dmcaNotice: LegalSection;
        dmcaHowToSubmit: LegalSection;
        governingLaw: LegalSection;
        contact: LegalSection;
    };
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export interface SettingsTranslations {
    title: string;
    language: string;
    darkMode: string;
    lightMode: string;
    playlistProvider: string;
    liveProtection: string;
    moviesProtection: string;
    seriesProtection: string;
    clearWatchHistory: string;
    clearFavorites: string;
    clearWatchLater: string;
    alerts: {
        clearHistoryTitle: string;
        clearHistoryMsg: string;
        clearFavoritesTitle: string;
        clearFavoritesMsg: string;
        clearWatchLaterTitle: string;
        clearWatchLaterMsg: string;
        clear: string;
        done: string;
        historyCleared: string;
        favoritesCleared: string;
        watchLaterCleared: string;
    };
}

// ─── Aggregate ─────────────────────────────────────────────────────────────────
export interface AppTranslations {
    common: CommonTranslations;
    onboarding: OnboardingTranslations;
    login: LoginTranslations;
    dashboard: DashboardTranslations;
    content: ContentTranslations;
    player: PlayerTranslations;
    legal: LegalTranslations;
    settings: SettingsTranslations;
}

export type Locale = 'ar' | 'en' | 'fr' | 'tr' | 'ku' | 'ckb';
