import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import 'react-native-get-random-values';
import { useAudio } from '@/hooks/useAudio';

const TIMER_STATE_KEY = '@timer_state';
const BACKGROUND_TIMESTAMP_KEY = '@background_timestamp';

export interface Timer {
  id: string;
  label: string;
  minutes: number;
  seconds: number;
  status: 'pending' | 'running' | 'completed';
  originalMinutes: number;
  originalSeconds: number;
}

export interface TimerAppState {
  timers: Timer[];
  currentTimerIndex: number;
  isRunning: boolean;
  backgroundTimestamp?: number;
  timerStartTime?: number;
}

interface TimerContextType {
  appState: TimerAppState;
  addTimer: () => void;
  updateTimer: (id: string, updates: Partial<Timer>) => void;
  removeTimer: (id: string) => void;
  startMeditation: () => Promise<boolean>;
  stopMeditation: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Simple UUID generator for React Native
const generateId = () => {
  return 'timer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

interface TimerProviderProps {
  children: ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const { playChime } = useAudio();
  
  const [appState, setAppState] = useState<TimerAppState>({
    timers: [{
      id: generateId(),
      label: '',
      minutes: 5,
      seconds: 0,
      status: 'pending',
      originalMinutes: 5,
      originalSeconds: 0
    }],
    currentTimerIndex: -1,
    isRunning: false
  });

  // Handle app state changes for background timer support
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' && appState.isRunning) {
      // App going to background - save timestamp
      const timestamp = Date.now();
      await AsyncStorage.setItem(BACKGROUND_TIMESTAMP_KEY, timestamp.toString());
      await AsyncStorage.setItem(TIMER_STATE_KEY, JSON.stringify(appState));
    } else if (nextAppState === 'active') {
      // App coming to foreground - calculate elapsed time
      try {
        const backgroundTimestamp = await AsyncStorage.getItem(BACKGROUND_TIMESTAMP_KEY);
        const savedState = await AsyncStorage.getItem(TIMER_STATE_KEY);
        
        if (backgroundTimestamp && savedState && appState.isRunning) {
          const elapsedSeconds = Math.floor((Date.now() - parseInt(backgroundTimestamp)) / 1000);
          const parsedState = JSON.parse(savedState) as TimerAppState;
          
          if (elapsedSeconds > 0) {
            // Apply elapsed time to current timer
            setAppState(prev => {
              if (prev.currentTimerIndex === -1 || !prev.isRunning) return prev;
              
              const currentTimer = prev.timers[prev.currentTimerIndex];
              if (!currentTimer || currentTimer.status !== 'running') return prev;
              
              let remainingSeconds = currentTimer.minutes * 60 + currentTimer.seconds - elapsedSeconds;
              let currentIndex = prev.currentTimerIndex;
              
              // Handle timer completion and progression
              while (remainingSeconds <= 0 && currentIndex < prev.timers.length) {
                // Play chime for completed timer
                if (playChime) {
                  playChime();
                }
                
                currentIndex++;
                if (currentIndex < prev.timers.length) {
                  remainingSeconds += prev.timers[currentIndex].originalMinutes * 60 + prev.timers[currentIndex].originalSeconds;
                }
              }
              
              // Update state based on calculations
              if (currentIndex >= prev.timers.length) {
                // All timers completed
                return {
                  ...prev,
                  isRunning: false,
                  currentTimerIndex: -1,
                  timers: prev.timers.map((timer, index) => ({
                    ...timer,
                    status: 'completed' as const,
                    minutes: 0,
                    seconds: 0
                  }))
                };
              } else {
                // Update current timer with remaining time
                const newMinutes = Math.floor(remainingSeconds / 60);
                const newSeconds = remainingSeconds % 60;
                
                return {
                  ...prev,
                  currentTimerIndex: currentIndex,
                  timers: prev.timers.map((timer, index) => {
                    if (index < currentIndex) {
                      return { ...timer, status: 'completed' as const, minutes: 0, seconds: 0 };
                    } else if (index === currentIndex) {
                      return { ...timer, status: 'running' as const, minutes: newMinutes, seconds: newSeconds };
                    }
                    return timer;
                  })
                };
              }
            });
          }
        }
        
        // Clear stored data
        await AsyncStorage.removeItem(BACKGROUND_TIMESTAMP_KEY);
        await AsyncStorage.removeItem(TIMER_STATE_KEY);
      } catch (error) {
        console.warn('Error restoring timer state from background:', error);
      }
    }
  }, [appState.isRunning, appState.currentTimerIndex, playChime]);

  // Set up AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  const addTimer = useCallback(() => {
    const newTimer: Timer = {
      id: generateId(),
      label: '',
      minutes: 5,
      seconds: 0,
      status: 'pending',
      originalMinutes: 5,
      originalSeconds: 0
    };
    setAppState(prev => ({
      ...prev,
      timers: [...prev.timers, newTimer]
    }));
  }, []);

  const updateTimer = useCallback((id: string, updates: Partial<Timer>) => {
    setAppState(prev => ({
      ...prev,
      timers: prev.timers.map(timer =>
        timer.id === id ? { ...timer, ...updates } : timer
      )
    }));
  }, []);

  const removeTimer = useCallback((id: string) => {
    setAppState(prev => ({
      ...prev,
      timers: prev.timers.filter(timer => timer.id !== id)
    }));
  }, []);

  const startMeditation = useCallback(async () => {
    // Validate that all timers have a duration > 0
    const hasInvalidTimer = appState.timers.some(timer =>
      timer.originalMinutes === 0 && timer.originalSeconds === 0
    );

    if (hasInvalidTimer) {
      Alert.alert('Invalid Timer', 'Please set a duration for all timers (at least 1 second)');
      return false;
    }

    // Play start sound
    try {
      if (playChime) {
        await playChime();
      }
    } catch (error) {
      console.warn('Start meditation sound failed:', error);
      // Don't prevent starting if sound fails
    }

    // Activate keep awake
    try {
      await activateKeepAwakeAsync();
    } catch (error) {
      console.warn('Failed to activate keep awake:', error);
    }

    setAppState(prev => ({
      ...prev,
      isRunning: true,
      currentTimerIndex: 0,
      timerStartTime: Date.now(),
      timers: prev.timers.map((timer, index) => ({
        ...timer,
        status: index === 0 ? 'running' : 'pending',
        minutes: timer.originalMinutes,
        seconds: timer.originalSeconds
      }))
    }));

    return true;
  }, [appState.timers, playChime]);

  const stopMeditation = useCallback(async () => {
    // Deactivate keep awake
    try {
      deactivateKeepAwake();
    } catch (error) {
      console.warn('Failed to deactivate keep awake:', error);
    }

    // Clear any background timer data
    try {
      await AsyncStorage.removeItem(BACKGROUND_TIMESTAMP_KEY);
      await AsyncStorage.removeItem(TIMER_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear background timer data:', error);
    }

    setAppState(prev => ({
      ...prev,
      isRunning: false,
      currentTimerIndex: -1,
      timerStartTime: undefined,
      backgroundTimestamp: undefined,
      timers: prev.timers.map(timer => ({
        ...timer,
        status: 'pending',
        minutes: timer.originalMinutes,
        seconds: timer.originalSeconds
      }))
    }));
  }, []);

  // Main timer countdown effect
  useEffect(() => {
    if (!appState.isRunning || appState.currentTimerIndex === -1) return;

    const interval = setInterval(() => {
      setAppState(prev => {
        const currentTimer = prev.timers[prev.currentTimerIndex];

        if (!currentTimer || currentTimer.status !== 'running') {
          return prev;
        }

        const newSeconds = currentTimer.seconds - 1;
        const newMinutes = newSeconds < 0 ? currentTimer.minutes - 1 : currentTimer.minutes;
        const adjustedSeconds = newSeconds < 0 ? 59 : newSeconds;

        // Timer completed
        if (newMinutes < 0) {
          // Play chime sound when timer completes
          if (playChime) {
            playChime();
          }
          
          const nextTimerIndex = prev.currentTimerIndex + 1;
          const hasNextTimer = nextTimerIndex < prev.timers.length;

          // Deactivate keep awake if all timers are completed
          if (!hasNextTimer) {
            try {
              deactivateKeepAwake();
            } catch (error) {
              console.warn('Failed to deactivate keep awake on completion:', error);
            }
          }

          return {
            ...prev,
            currentTimerIndex: hasNextTimer ? nextTimerIndex : -1,
            isRunning: hasNextTimer,
            timers: prev.timers.map((timer, index) => {
              if (index === prev.currentTimerIndex) {
                return { ...timer, status: 'completed' as const, minutes: 0, seconds: 0 };
              }
              if (index === nextTimerIndex && hasNextTimer) {
                return { ...timer, status: 'running' as const, minutes: timer.originalMinutes, seconds: timer.originalSeconds };
              }
              return timer;
            })
          };
        }

        // Update current timer
        return {
          ...prev,
          timers: prev.timers.map((timer, index) =>
            index === prev.currentTimerIndex
              ? { ...timer, minutes: newMinutes, seconds: adjustedSeconds }
              : timer
          )
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [appState.isRunning, appState.currentTimerIndex, playChime]);

  const contextValue: TimerContextType = {
    appState,
    addTimer,
    updateTimer,
    removeTimer,
    startMeditation,
    stopMeditation
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};