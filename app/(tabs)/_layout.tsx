/**
 * (tabs)/_layout.tsx — Premium Glass Tab Bar
 * - Full-width blurred glass effect on mobile with curved top edges
 * - TV mode: standard solid bottom bar
 * - RTL support, dark/light mode
 * - Clean spacing preventing text/icon overflow
 */

import { Brand, FontFamily } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isTV = Platform.isTV;
const tv = (mobile: number, tvVal: number) => (isTV ? tvVal : mobile);

import { TVPressable } from '@/components/shared/TVPressable';

// ─── Individual Tab Icon ──────────────────────────────────────────────────
function TabBarIcon({
  name,
  label,
  focused,
  isDark,
  accentColor,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  isDark: boolean;
  accentColor: string;
}) {
  const scale = useSharedValue(focused ? 1.05 : 1);
  const translateY = useSharedValue(focused ? -2 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.05 : 1, { damping: 14, stiffness: 220 });
    translateY.value = withSpring(focused ? -4 : 0, { damping: 14, stiffness: 220 });
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const iconColor = focused ? accentColor : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const iconName = focused ? (name.replace('-outline', '') as typeof name) : name;

  return (
    <View style={styles.tabContainer}>
      <Animated.View style={[styles.tabContent, animStyle]}>
        <View
          style={[
            styles.iconWrapper,
            focused && isDark && {
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
        >
          <Ionicons name={iconName} size={tv(24, 32)} color={iconColor} />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            {
              color: focused ? (isDark ? '#FFFFFF' : '#000000') : iconColor,
              fontFamily: focused ? FontFamily.bold : FontFamily.medium,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Custom Tab Bar (Fixes TV Remote Focus) ────────────────────────────────
function CustomTabBar({ state, descriptors, navigation, insets: tabInsets }: any) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const accentColor = Brand.primary;

  // Same height as TabLayout's tabHeight for TV (80)
  const topOffset = insets.top + (isTV ? 54 : 0);

  return (
    <View
      style={[
        styles.customBar,
        {
          top: topOffset,
          backgroundColor: isDark ? '#12121A' : '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: keyof typeof Ionicons.glyphMap = 'tv-outline';
        if (route.name === 'live') iconName = 'tv-outline';
        if (route.name === 'movies') iconName = 'film-outline';
        if (route.name === 'series') iconName = 'play-circle-outline';

        return (
          <TVPressable
            key={route.key}
            onPress={onPress}
            style={[styles.customTab, isFocused && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
            focusVariant="control"
            hasTVPreferredFocus={isFocused}
          >
            <TabBarIcon
              name={iconName}
              label={label}
              focused={isFocused}
              isDark={isDark}
              accentColor={accentColor}
            />
          </TVPressable>
        );
      })}
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { isDark } = useAppTheme();
  const { t } = useLanguage();
  const { hideLive, hideMovies, hideSeries } = useSettings();
  const insets = useSafeAreaInsets();

  const accentColor = Brand.primary;

  // On iOS, use safe area inset. On Android, provide default bottom padding.
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12;

  // Height calculated organically based on padding, icons, labels, and space.
  const tabHeight = isTV ? 80 : 64 + bottomPadding;

  const tabs = [
    {
      name: 'live',
      icon: 'tv-outline' as keyof typeof Ionicons.glyphMap,
      label: t.dashboard.liveTV,
      hide: hideLive,
    },
    {
      name: 'movies',
      icon: 'film-outline' as keyof typeof Ionicons.glyphMap,
      label: t.dashboard.movies,
      hide: hideMovies,
    },
    {
      name: 'series',
      icon: 'play-circle-outline' as keyof typeof Ionicons.glyphMap,
      label: t.dashboard.series,
      hide: hideSeries,
    },
  ];

  return (
    <Tabs
      tabBar={isTV ? (props) => <CustomTabBar {...props} /> : undefined}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarShowLabel: false, // We render the label inside TabBarIcon
        tabBarStyle: isTV ? { display: 'none' } : {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          height: tabHeight,
          // Transparent fallback if BlurView works, solid TV background
          backgroundColor: isDark ? 'rgba(10,10,15,0.75)' : 'rgba(255,255,255,0.85)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 12,
          paddingBottom: bottomPadding,
        },
        tabBarBackground: isTV
          ? undefined
          : () => (
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={isDark ? 50 : 80}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                overflow: 'hidden',
              }}
            />
          ),
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            href: tab.hide ? null : `/(tabs)/${tab.name}` as any,
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                name={tab.icon}
                label={tab.label}
                focused={focused}
                isDark={isDark}
                accentColor={accentColor}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: tv(4, 6),
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: tv(11, 14),
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: tv(2, 4), // Fallback spacing in case gap is unsupported
    minWidth: tv(48, 64),
  },
  customBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  customTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
