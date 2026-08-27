import { ContentScreen } from '@/components/shared/ContentScreen';
import { XtreamStream } from '@/services/xtream-service';
import { router } from 'expo-router';
import React from 'react';

export default function MoviesScreen() {
    const handlePress = (stream: XtreamStream) => {
        router.push({
            pathname: '/details',
            params: {
                streamId: stream.stream_id,
                extension: stream.container_extension || 'mp4',
                type: 'movie',
            },
        });
    };

    return (
        <ContentScreen
            type="movie"
            accentColor="#8b5cf6"
            gradientColors={['#7c3aed', '#4c1d95', '#09090F']}
            icon="film-outline"
            onPressItem={handlePress}
        />
    );
}
