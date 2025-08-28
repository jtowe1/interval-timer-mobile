import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import 'react-native-get-random-values';
import { useAudio } from '@/hooks/useAudio';

const TIMER_STATE_KEY = '@timer_state';
const BACKGROUND_TIMESTAMP_KEY = '@background_timestamp';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  scheduledNotifications?: string[];
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

// Request notification permissions
const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

// Schedule notifications for each timer
const scheduleTimerNotifications = async (timers: Timer[], startTime: number): Promise<string[]> => {
  const notificationIds: string[] = [];
  let cumulativeDuration = 0; // Track cumulative duration from start
  
  for (let i = 0; i < timers.length; i++) {
    const timer = timers[i];
    const timerDurationSeconds = timer.originalMinutes * 60 + timer.originalSeconds;
    cumulativeDuration += timerDurationSeconds;
    
    // Calculate delay from the actual start time
    const delayFromStart = cumulativeDuration;
    
    try {
      console.log(`Scheduling notification for timer ${i + 1}: ${timer.label || 'Unnamed'} to fire in ${delayFromStart} seconds`);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Timer Complete',
          body: timer.label ? `"${timer.label}" completed` : `Timer ${i + 1} completed`,
          sound: 'default',
          data: { timerId: timer.id, timerIndex: i },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delayFromStart,
        },
      });
      
      notificationIds.push(notificationId);
    } catch (error) {
      console.warn('Failed to schedule notification for timer:', timer.id, error);
    }
  }
  
  console.log(`Scheduled ${notificationIds.length} notifications for ${timers.length} timers`);
  return notificationIds;
};

// Cancel all scheduled notifications
const cancelScheduledNotifications = async (notificationIds: string[]) => {
  try {
    await Promise.all(notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (error) {
    console.warn('Failed to cancel some notifications:', error);
  }
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

    // Request notification permissions
    const hasNotificationPermission = await requestNotificationPermissions();
    if (!hasNotificationPermission) {
      console.warn('Notification permissions not granted - timers may not work when app is backgrounded');
    }

    // Activate keep awake
    try {
      await activateKeepAwakeAsync();
    } catch (error) {
      console.warn('Failed to activate keep awake:', error);
    }

    const startTime = Date.now();
    console.log('Starting timer session at:', new Date(startTime).toLocaleTimeString());
    
    // Schedule notifications for background completion
    let scheduledNotifications: string[] = [];
    if (hasNotificationPermission) {
      console.log('Scheduling notifications for', appState.timers.length, 'timers');
      scheduledNotifications = await scheduleTimerNotifications(appState.timers, startTime);
      console.log('Successfully scheduled', scheduledNotifications.length, 'notifications');
    } else {
      console.log('No notification permissions - timers will only work when app is active');
    }

    setAppState(prev => ({
      ...prev,
      isRunning: true,
      currentTimerIndex: 0,
      timerStartTime: startTime,
      scheduledNotifications,
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
    console.log('Stopping meditation session');
    
    // Cancel any scheduled notifications
    if (appState.scheduledNotifications && appState.scheduledNotifications.length > 0) {
      console.log('Cancelling', appState.scheduledNotifications.length, 'scheduled notifications');
      await cancelScheduledNotifications(appState.scheduledNotifications);
    }

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
      scheduledNotifications: undefined,
      timers: prev.timers.map(timer => ({
        ...timer,
        status: 'pending',
        minutes: timer.originalMinutes,
        seconds: timer.originalSeconds
      }))
    }));
  }, [appState.scheduledNotifications]);

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

          // Cancel the notification for the completed timer since it completed in foreground
          if (prev.scheduledNotifications && prev.scheduledNotifications[prev.currentTimerIndex]) {
            Notifications.cancelScheduledNotificationAsync(prev.scheduledNotifications[prev.currentTimerIndex])
              .catch(error => console.warn('Failed to cancel completed timer notification:', error));
          }

          // Deactivate keep awake if all timers are completed
          if (!hasNextTimer) {
            try {
              deactivateKeepAwake();
            } catch (error) {
              console.warn('Failed to deactivate keep awake on completion:', error);
            }

            // Cancel any remaining notifications since all timers are complete
            if (prev.scheduledNotifications && prev.scheduledNotifications.length > 0) {
              cancelScheduledNotifications(prev.scheduledNotifications)
                .catch(error => console.warn('Failed to cancel remaining notifications:', error));
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