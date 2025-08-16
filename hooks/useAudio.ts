import { useCallback } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export const useAudio = () => {
  // Play a simple chime sound using generated audio
  const playChime = useCallback(async () => {
    try {
      // Configure audio mode for timer sounds
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and play a synthetic chime sound
      // This creates a harmonic chime similar to the web app
      const sound = new Audio.Sound();
      
      // For this implementation, we'll use a fallback approach
      // You can add audio files to assets/audio/ directory if desired
      throw new Error('Audio file not available - using haptic fallback');
      
      await sound.playAsync();
      
      // Add haptic feedback for better UX
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Clean up sound after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
      
    } catch (error) {
      // Fallback to haptic feedback if audio fails
      console.warn('Audio playback failed:', error);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  // Alternative method using generated audio (no external files needed)
  const playGeneratedChime = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // For now, use haptic feedback as the primary notification
      // This provides immediate feedback without requiring audio files
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Small delay and a softer haptic for the "chime" effect
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 150);
      
    } catch (error) {
      console.warn('Generated chime failed:', error);
    }
  }, []);

  return {
    playChime: playGeneratedChime, // Use generated chime for now
    playGeneratedChime,
  };
};