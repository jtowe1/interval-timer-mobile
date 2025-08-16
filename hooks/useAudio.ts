import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform, Alert } from 'react-native';

export const useAudio = () => {
  // Create an audio player for chime sounds
  const player = useAudioPlayer();

  // Play chime using modern expo-audio hooks
  const playChime = useCallback(async () => {
    console.log('🔊 Playing chime - Platform:', Platform.OS);
    
    try {
      // Strategy 1: Try programmatic beep generation
      console.log('🔊 Trying programmatic beep...');
      await playProgrammaticBeep();
      
    } catch (primaryError) {
      console.warn('🔊 Programmatic beep failed:', primaryError);
      
      try {
        // Strategy 2: Enhanced haptic feedback as reliable fallback
        console.log('🔊 Using enhanced haptic feedback as fallback...');
        await playHapticChime();
        
      } catch (fallbackError) {
        console.warn('🔊 All audio methods failed:', fallbackError);
        
        // Strategy 3: Basic haptic as final fallback
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (hapticError) {
          console.warn('🔊 Even basic haptic failed:', hapticError);
        }
      }
    }
  }, []);

  // Generate a simple beep sound programmatically
  const playProgrammaticBeep = useCallback(async () => {
    try {
      console.log('🔊 Creating programmatic beep...');
      
      // Use Web Audio API (works in Expo web/mobile)
      if (Platform.OS === 'web') {
        // Web platform - use Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure the beep (similar to web app's chimes)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz tone
        oscillator.type = 'sine';
        
        // Set volume and fade out
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        // Play the beep
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        console.log('🔊 Web Audio API beep played');
        
      } else {
        // Mobile platform - create a simple sine wave data
        console.log('🔊 Attempting mobile audio generation...');
        
        // For mobile, we'll rely on haptic feedback as the primary method
        // since generating audio programmatically is complex without audio files
        throw new Error('Mobile programmatic audio not implemented - falling back to haptic');
      }
      
      // Add complementary haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
    } catch (error) {
      console.warn('🔊 Programmatic beep failed:', error);
      throw error; // Re-throw to allow fallback strategy
    }
  }, []);

  // Enhanced haptic feedback that creates a chime-like pattern
  const playHapticChime = useCallback(async () => {
    try {
      console.log('🔊 Playing haptic chime pattern...');
      
      // Create a pleasant chime-like haptic pattern
      // First pulse - strong start
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      console.log('🔊 Haptic pulse 1/3');
      
      // Wait and second pulse - medium resonance
      await new Promise(resolve => setTimeout(resolve, 150));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('🔊 Haptic pulse 2/3');
      
      // Wait and final pulse - light fade out
      await new Promise(resolve => setTimeout(resolve, 150));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('🔊 Haptic pulse 3/3');
      
      // Optional fourth very light pulse for resonance
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        console.log('🔊 Haptic resonance pulse');
      } catch (e) {
        // Ignore if this fails
      }
      
      console.log('🔊 Haptic chime pattern completed');
      
    } catch (error) {
      console.warn('🔊 Haptic chime pattern failed:', error);
      throw error;
    }
  }, []);

  // Alternative: Try to play a notification-like beep (Android)
  const playNotificationBeep = useCallback(async () => {
    try {
      console.log('🔊 Trying notification beep for Android...');
      
      // On Android, we can try to play a system notification sound
      // This is more reliable than custom audio in emulators
      if (Platform.OS === 'android') {
        // Create a simple notification-like pattern with haptics
        // This simulates what a system notification would feel/sound like
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('🔊 Android notification haptic played');
        
        // Add a short pause and another pulse for chime effect
        await new Promise(resolve => setTimeout(resolve, 200));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
      } else {
        // For iOS, use the success notification haptic
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('🔊 iOS notification haptic played');
      }
      
    } catch (error) {
      console.warn('🔊 Notification beep failed:', error);
      throw error;
    }
  }, []);

  // Test audio functionality
  const testAudio = useCallback(async () => {
    console.log('🔊 === AUDIO TEST STARTING ===');
    Alert.alert(
      'Audio Test', 
      `Testing timer completion sound on ${Platform.OS}...\n\nYou should hear/feel the chime notification.\n\nCheck console logs for detailed feedback.`,
      [
        {
          text: 'Test Chime',
          onPress: async () => {
            console.log('🔊 User initiated chime test');
            await playChime();
            console.log('🔊 === CHIME TEST COMPLETED ===');
          }
        },
        {
          text: 'Test Haptic Only',
          onPress: async () => {
            console.log('🔊 User initiated haptic test');
            await playHapticChime();
            console.log('🔊 === HAPTIC TEST COMPLETED ===');
          }
        },
        {
          text: 'Test Notification',
          onPress: async () => {
            console.log('🔊 User initiated notification test');
            await playNotificationBeep();
            console.log('🔊 === NOTIFICATION TEST COMPLETED ===');
          }
        }
      ]
    );
  }, [playChime, playHapticChime, playNotificationBeep]);

  return {
    playChime,
    playHapticChime,
    playNotificationBeep,
    testAudio,
    player, // Expose player for advanced usage if needed
  };
};