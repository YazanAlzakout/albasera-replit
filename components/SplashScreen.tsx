import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '@/components/shared/BrandLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const isWeb = Platform.OS === 'web';
  const finishedRef = useRef(false);
  const videoSource = require('../assets/images/splash-vid.mp4');

  const finishOnce = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    // Web autoplay is typically blocked when audio is enabled.
    player.muted = isWeb;
    player.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      finishOnce();
    });

    // Fallback: on web (or if event doesn't fire), never block app boot.
    const fallbackTimer = setTimeout(() => {
      finishOnce();
    }, isWeb ? 1400 : 1800);

    return () => {
      clearTimeout(fallbackTimer);
      subscription.remove();
    };
  }, [player, isWeb]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false} // Disable all controllers
        allowsPictureInPicture={false}
      />
      <View pointerEvents="none" style={styles.brandFallback}>
        <View style={styles.logoGlow} />
        <BrandLogo style={styles.logo} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090F',
  },
  brandFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(229, 9, 20, 0.16)',
  },
  logo: {
    width: 180,
    height: 180,
  },
});

export default SplashScreen;
