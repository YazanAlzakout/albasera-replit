import { ContentScreen } from '@/components/shared/ContentScreen';
import { XtreamStream } from '@/services/xtream-service';
import { router } from 'expo-router';
import React from 'react';

export default function SeriesScreen() {
    const handlePress = (stream: XtreamStream) => {
        const id = stream.stream_id ?? stream.series_id;
        if (!id) return;

        router.push({
            pathname: '/details',
            params: {
                streamId: id.toString(),
                extension: stream.container_extension || 'mp4',
                type: 'series',
            },
        });
    };

    return (
        <ContentScreen
            type="series"
            accentColor="#ec4899"
            gradientColors={['#db2777', '#831843', '#09090F']}
            icon="play-circle-outline"
            onPressItem={handlePress}
        />
    );
}
