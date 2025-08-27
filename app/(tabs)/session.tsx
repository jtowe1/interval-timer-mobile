import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { GradientBackground } from '@/components/GradientBackground';
import { CircularTimer } from '@/components/CircularTimer';
import { useTimer } from '@/contexts/TimerContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SessionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { appState, stopMeditation } = useTimer();
  const [hasSession, setHasSession] = useState(false);

  // Check if there's an active session when screen comes into focus
  useFocusEffect(() => {
    if (appState.isRunning || appState.currentTimerIndex >= 0) {
      setHasSession(true);
    } else {
      setHasSession(false);
    }
  });

  const handleStopSession = () => {
    Alert.alert(
      'Stop Session',
      'Are you sure you want to stop the current meditation session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            await stopMeditation();
            router.push('/');
          },
        },
      ]
    );
  };

  const formatTotalTime = () => {
    const totalMinutes = appState.timers.reduce((sum, timer) => 
      sum + timer.originalMinutes, 0);
    const totalSeconds = appState.timers.reduce((sum, timer) => 
      sum + timer.originalSeconds, 0);
    const adjustedMinutes = totalMinutes + Math.floor(totalSeconds / 60);
    const adjustedSeconds = totalSeconds % 60;
    
    return `${adjustedMinutes}:${String(adjustedSeconds).padStart(2, '0')}`;
  };

  const getSessionStatus = () => {
    if (!appState.isRunning && appState.currentTimerIndex === -1) {
      return 'No active session';
    }
    if (appState.currentTimerIndex >= appState.timers.length) {
      return 'Session completed';
    }
    return appState.isRunning ? 'Session active' : 'Session paused';
  };

  if (!hasSession) {
    return (
      <GradientBackground useSafeArea={true} safeAreaEdges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.noSessionContainer}>
          <ThemedText style={[styles.noSessionText, { color: 'white' }]}>
            No active session
          </ThemedText>
          <ThemedText style={[styles.noSessionSubtext, { color: 'rgba(255, 255, 255, 0.7)' }]}>
            Go to Setup to configure and start a timer session
          </ThemedText>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/')}
          >
            <ThemedText style={styles.setupButtonText}>
              Go to Setup
            </ThemedText>
          </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground useSafeArea={true} safeAreaEdges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Session header */}
      <View style={styles.header}>
        <ThemedText style={[styles.sessionStatus, { color: 'white' }]}>
          {getSessionStatus()}
        </ThemedText>
        {appState.timers.length > 1 && (
          <ThemedText style={[styles.totalTime, { color: 'rgba(255, 255, 255, 0.7)' }]}>
            Total: {formatTotalTime()}
          </ThemedText>
        )}
      </View>

      {/* Circular timer display */}
      <View style={styles.timerContainer}>
        <CircularTimer
          timers={appState.timers}
          currentTimerIndex={appState.currentTimerIndex}
          isRunning={appState.isRunning}
          size={320}
        />
      </View>

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.stopButton]}
          onPress={handleStopSession}
        >
          <ThemedText style={styles.stopButtonText}>
            Stop Session
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Session progress info */}
      {appState.timers.length > 1 && (
        <View style={styles.progressInfo}>
          <ThemedText style={[styles.progressText, { color: 'rgba(255, 255, 255, 0.7)' }]}>
            {appState.timers.filter(t => t.status === 'completed').length} of {appState.timers.length} timers completed
          </ThemedText>
        </View>
      )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  noSessionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noSessionText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  noSessionSubtext: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 280,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sessionStatus: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalTime: {
    fontSize: 14,
    opacity: 0.7,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    alignItems: 'center',
    marginTop: 20,
  },
  controlButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});