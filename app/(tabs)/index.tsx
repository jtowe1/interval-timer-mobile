import { StyleSheet, ScrollView, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { GradientBackground } from '@/components/GradientBackground';
import { useTimer } from '@/contexts/TimerContext';
import { useAudio } from '@/hooks/useAudio';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SetupScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { appState, addTimer, updateTimer, removeTimer, startMeditation } = useTimer();
  const { testAudio } = useAudio();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleStartSession = () => {
    const success = startMeditation();
    if (success) {
      router.push('/session');
    }
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (id: string, field: 'minutes' | 'seconds', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    const maxValue = field === 'minutes' ? 99 : 59;
    const finalValue = Math.min(numValue, maxValue);
    
    updateTimer(id, {
      [field]: finalValue,
      [`original${field.charAt(0).toUpperCase() + field.slice(1)}`]: finalValue
    });
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.titleContainer}>
        <ThemedText type="title" style={styles.titleText}>Interval Timer Setup</ThemedText>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {appState.timers.map((timer, index) => (
          <View key={timer.id} style={[styles.timerItem, styles.glassCard]}>
            <View style={styles.timerHeader}>
              <ThemedText style={[styles.timerNumber, { color: 'white' }]}>Timer {index + 1}</ThemedText>
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  if (appState.timers.length > 1) {
                    removeTimer(timer.id);
                  } else {
                    Alert.alert('Cannot Remove', 'You must have at least one timer');
                  }
                }}
              >
                <ThemedText style={styles.removeButtonText}>×</ThemedText>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.labelInput, styles.glassInput]}
              placeholder="Timer label (optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={timer.label}
              onChangeText={(text) => updateTimer(timer.id, { label: text })}
            />

            <View style={styles.timeContainer}>
              <View style={styles.timeInput}>
                <ThemedText style={[styles.timeLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Minutes</ThemedText>
                <TextInput
                  style={[styles.numberInput, styles.glassInput]}
                  value={timer.originalMinutes.toString()}
                  onChangeText={(value) => handleTimeChange(timer.id, 'minutes', value)}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={styles.timeInput}>
                <ThemedText style={[styles.timeLabel, { color: 'rgba(255, 255, 255, 0.8)' }]}>Seconds</ThemedText>
                <TextInput
                  style={[styles.numberInput, styles.glassInput]}
                  value={timer.originalSeconds.toString()}
                  onChangeText={(value) => handleTimeChange(timer.id, 'seconds', value)}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <ThemedText style={[styles.durationText, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              Duration: {formatTime(timer.originalMinutes, timer.originalSeconds)}
            </ThemedText>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addButton, styles.glassButton]}
          onPress={addTimer}
        >
          <ThemedText style={styles.addButtonText}>+ Add Timer</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testAudioButton, styles.glassButton]}
          onPress={testAudio}
        >
          <ThemedText style={styles.testAudioButtonText}>🔊 Test Audio</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.startButton, styles.primaryButton]}
          onPress={handleStartSession}
        >
          <ThemedText style={styles.startButtonText}>Start Session</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    marginBottom: 20,
  },
  titleText: {
    color: 'white',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  timerItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  glassInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
  },
  glassButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryButton: {
    backgroundColor: '#4FD1C7',
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  labelInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testAudioButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testAudioButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
