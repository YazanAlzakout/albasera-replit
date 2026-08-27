import { TVPressable } from '@/components/shared/TVPressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { XtreamCategory, xtreamService, XtreamStream } from '@/services/xtream-service';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

interface ContentListProps {
    type: 'live' | 'movie' | 'series';
    onPress: (stream: XtreamStream) => void;
}

export const ContentList: React.FC<ContentListProps> = ({ type, onPress }) => {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<XtreamCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [streams, setStreams] = useState<XtreamStream[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const cats = await xtreamService.getCategories(type);
            setCategories(cats);
            if (cats.length > 0) {
                setSelectedCategory(cats[0].category_id);
                fetchStreams(cats[0].category_id);
            }
        } catch (error) {
            console.error('Failed to load categories', error);
            setLoading(false);
        }
    };

    const fetchStreams = async (categoryId: string) => {
        setLoading(true);
        try {
            const data = await xtreamService.getStreams(type, categoryId);
            setStreams(data);
        } catch (error) {
            console.error('Failed to load streams', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStreams = useMemo(() => {
        if (!searchQuery) return streams;
        return streams.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [streams, searchQuery]);

    const renderCategoryItem = ({ item }: { item: XtreamCategory }) => (
        <TVPressable
            style={[
                styles.categoryButton,
                selectedCategory === item.category_id && styles.categoryButtonActive
            ]}
            focusVariant="control"
            onPress={() => {
                setSelectedCategory(item.category_id);
                fetchStreams(item.category_id);
            }}
        >
            <ThemedText style={[
                styles.categoryText,
                selectedCategory === item.category_id && styles.categoryTextActive
            ]}>
                {item.category_name}
            </ThemedText>
        </TVPressable>
    );

    const renderStreamItem = ({ item, index }: { item: XtreamStream, index: number }) => (
        <Animated.View entering={FadeIn.delay(index % 10 * 50)}>
            <TVPressable style={styles.streamCard} onPress={() => onPress(item)} focusVariant="card">
                <Image
                    source={{ uri: item.stream_icon || item.cover }}
                    placeholder={{ blurhash: 'L6PZfSjt00_q.u9F%gIV00_gMx9F' }}
                    contentFit="cover"
                    transition={500}
                    style={styles.streamIcon}
                />
                <BlurView intensity={20} tint="dark" style={styles.streamInfo}>
                    <ThemedText numberOfLines={2} style={styles.streamName}>{item.name}</ThemedText>
                </BlurView>
                {type === 'live' && item.stream_type === 'live' && (
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <ThemedText style={styles.liveText}>LIVE</ThemedText>
                    </View>
                )}
            </TVPressable>
        </Animated.View>
    );

    return (
        <ThemedView style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <BlurView intensity={10} tint="light" style={styles.searchBlur}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="بحث..."
                        placeholderTextColor="#64748b"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </BlurView>
            </View>

            {/* Categories */}
            <View style={{ height: 50, marginBottom: 10 }}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={item => item.category_id}
                    contentContainerStyle={styles.categoryList}
                />
            </View>

            {/* Streams Grid */}
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList
                    data={filteredStreams}
                    renderItem={renderStreamItem}
                    keyExtractor={item => (item.stream_id || item.series_id || Math.random()).toString()}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.streamList}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    getItemLayout={(_, index) => ({
                        length: ITEM_WIDTH * 1.4 + 10,
                        offset: (ITEM_WIDTH * 1.4 + 10) * Math.floor(index / COLUMN_COUNT),
                        index,
                    })}
                />
            )}
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 10,
    },
    searchContainer: {
        paddingVertical: 15,
    },
    searchBlur: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 44,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        textAlign: 'right',
        marginRight: 10,
    },
    categoryList: {
        paddingHorizontal: 5,
        flexDirection: 'row-reverse',
    },
    categoryButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        marginHorizontal: 5,
        height: 36,
        justifyContent: 'center',
    },
    categoryButtonActive: {
        backgroundColor: '#3b82f6',
    },
    categoryText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    categoryTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    streamList: {
        paddingBottom: 20,
    },
    streamCard: {
        width: ITEM_WIDTH - 10,
        height: ITEM_WIDTH * 1.4,
        margin: 5,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    streamIcon: {
        width: '100%',
        height: '100%',
    },
    streamInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
    },
    streamName: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
        textAlign: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#ef4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginRight: 4,
    },
    liveText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    }
});
