import { ContentScreen } from '@/components/shared/ContentScreen';
import { Brand } from '@/constants/theme';
import { XtreamStream } from '@/services/xtream-service';
import { router } from 'expo-router';
import React from 'react';

export default function LiveScreen() {
    const handlePress = (stream: XtreamStream) => {
        router.push({
            pathname: '/player',
            params: {
                streamId: stream.stream_id,
                extension: stream.container_extension || 'm3u8',
                type: 'live',
                name: stream.name,
            },
        });
    };

    return (
        <ContentScreen
            type="live"
            accentColor={Brand.primary}
            gradientColors={['#E50914', '#900', '#09090F']}
            icon="tv-outline"
            onPressItem={handlePress}
        />
    );
}
