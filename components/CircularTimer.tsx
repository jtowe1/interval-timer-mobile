import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { Timer } from '@/contexts/TimerContext';

interface CircularTimerProps {
  timers: Timer[];
  currentTimerIndex: number;
  isRunning: boolean;
  size?: number;
}

// Color system for multiple timers
const timerColors = {
  timer1: '#0d7fe6', // Primary Blue
  timer2: '#52a652', // Nature Green
  timer3: '#a87c63', // Earth Brown
  timer4: '#14b8a6', // Secondary Teal
  timer5: '#c19a6b'  // Warm Accent
};

export const CircularTimer: React.FC<CircularTimerProps> = ({
  timers,
  currentTimerIndex,
  isRunning,
  size = 280,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const currentTimer = currentTimerIndex >= 0 ? timers[currentTimerIndex] : timers[0];
  const center = size / 2;
  const radius = size * 0.35; // About 35% of the size
  const strokeWidth = 12;

  // Generate color for timer based on index
  const getTimerColor = (index: number) => {
    const colorKeys = Object.keys(timerColors) as Array<keyof typeof timerColors>;
    const colorKey = colorKeys[index % colorKeys.length];
    return timerColors[colorKey];
  };

  // Calculate progress for current timer
  const calculateProgress = (timer: Timer) => {
    const totalSeconds = timer.originalMinutes * 60 + timer.originalSeconds;
    const currentSeconds = timer.minutes * 60 + timer.seconds;
    return totalSeconds > 0 ? ((totalSeconds - currentSeconds) / totalSeconds) * 100 : 0;
  };

  // Calculate session data and timer boundaries
  const calculateSessionData = () => {
    const totalSessionSeconds = timers.reduce((sum, timer) =>
      sum + timer.originalMinutes * 60 + timer.originalSeconds, 0);

    let cumulativeSeconds = 0;
    const timerBoundaries = timers.map((timer, index) => {
      const timerDuration = timer.originalMinutes * 60 + timer.originalSeconds;
      const startPercent = (cumulativeSeconds / totalSessionSeconds) * 100;
      cumulativeSeconds += timerDuration;
      const endPercent = (cumulativeSeconds / totalSessionSeconds) * 100;

      return {
        index,
        startPercent,
        endPercent,
        duration: timerDuration,
        timer
      };
    });

    // Calculate overall session progress
    const completedSeconds = timers.slice(0, currentTimerIndex).reduce((sum, timer) =>
      sum + timer.originalMinutes * 60 + timer.originalSeconds, 0);
    const currentTimerProgress = currentTimer ?
      (currentTimer.originalMinutes * 60 + currentTimer.originalSeconds) - (currentTimer.minutes * 60 + currentTimer.seconds) : 0;
    const sessionProgress = totalSessionSeconds > 0 ?
      ((completedSeconds + currentTimerProgress) / totalSessionSeconds) * 100 : 0;

    return {
      sessionProgress,
      timerBoundaries,
      totalSessionSeconds
    };
  };

  // Create SVG path for progress arc
  const createProgressPath = (progress: number, radius: number) => {
    const angle = (progress / 100) * 360;
    const radians = (angle - 90) * Math.PI / 180; // Start from top (12 o'clock)
    const x = center + radius * Math.cos(radians);
    const y = center + radius * Math.sin(radians);
    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`;
  };

  // Create arc path for timer segments
  const createSegmentPath = (startPercent: number, endPercent: number, radius: number) => {
    const startAngle = (startPercent / 100) * 360 - 90;
    const endAngle = (endPercent / 100) * 360 - 90;
    const startRadians = startAngle * Math.PI / 180;
    const endRadians = endAngle * Math.PI / 180;

    const startX = center + radius * Math.cos(startRadians);
    const startY = center + radius * Math.sin(startRadians);
    const endX = center + radius * Math.cos(endRadians);
    const endY = center + radius * Math.sin(endRadians);

    const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // Get position for timer markers
  const getMarkerPosition = (percent: number, radius: number) => {
    const angle = (percent / 100) * 360 - 90; // Start from top (12 o'clock)
    const radians = angle * Math.PI / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians)
    };
  };

  const sessionData = calculateSessionData();
  const currentProgress = currentTimer ? calculateProgress(currentTimer) : 0;

  const formatTime = (minutes: number, seconds: number) => {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius + 20}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2"
        />

        {/* Background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Completed segments */}
        <G>
          {sessionData.timerBoundaries.map((boundary, index) => {
            if (index >= currentTimerIndex) return null;
            const color = getTimerColor(index);
            const path = createSegmentPath(boundary.startPercent, boundary.endPercent, radius);

            return (
              <Path
                key={`completed-${boundary.timer.id}`}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeOpacity={0.6}
                strokeLinecap="round"
              />
            );
          })}
        </G>

        {/* Current active segment background */}
        {currentTimerIndex >= 0 && currentTimerIndex < sessionData.timerBoundaries.length && (
          <Path
            d={createSegmentPath(
              sessionData.timerBoundaries[currentTimerIndex].startPercent,
              sessionData.timerBoundaries[currentTimerIndex].endPercent,
              radius
            )}
            fill="none"
            stroke={getTimerColor(currentTimerIndex)}
            strokeWidth={strokeWidth}
            strokeOpacity={0.3}
            strokeLinecap="round"
          />
        )}

        {/* Current session progress */}
        {sessionData.sessionProgress > 0 && (
          <Path
            d={createProgressPath(sessionData.sessionProgress, radius)}
            fill="none"
            stroke={currentTimer ? getTimerColor(currentTimerIndex) : 'rgba(255, 255, 255, 0.8)'}
            strokeWidth={strokeWidth}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />
        )}

        {/* Timer boundary markers */}
        <G>
          {sessionData.timerBoundaries.map((boundary, index) => {
            const position = getMarkerPosition(boundary.endPercent, radius);
            const color = getTimerColor(index);
            const isCompleted = boundary.timer.status === 'completed';
            const isCurrent = index === currentTimerIndex;
            const isPending = boundary.timer.status === 'pending';

            return (
              <G key={`marker-${boundary.timer.id}`}>
                <Circle
                  cx={position.x}
                  cy={position.y}
                  r={isCurrent ? 6 : 4}
                  fill={isCompleted ? color : isPending ? 'none' : color}
                  stroke={isPending ? color : 'rgba(255, 255, 255, 0.8)'}
                  strokeWidth={isPending ? 2 : 1}
                  fillOpacity={isCompleted ? 0.9 : isCurrent ? 0.8 : 0.6}
                />
                
                {/* Current timer indicator */}
                {isCurrent && (
                  <Circle
                    cx={position.x}
                    cy={position.y}
                    r={8}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={0.5}
                  />
                )}
              </G>
            );
          })}
        </G>
      </Svg>

      {/* Central content */}
      <View style={styles.centerContent}>
        {/* Timer status */}
        {currentTimer?.status === 'running' && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getTimerColor(currentTimerIndex) }]} />
            <Text style={[styles.statusText, styles.timerSubtext]}>ACTIVE</Text>
          </View>
        )}
        
        {currentTimer?.status === 'completed' && (
          <View style={styles.statusContainer}>
            <View style={[styles.completedIndicator, { backgroundColor: getTimerColor(currentTimerIndex) }]}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={[styles.statusText, styles.timerSubtext]}>COMPLETE</Text>
          </View>
        )}

        {/* Main time display */}
        <Text style={[styles.timeText, styles.timerText]}>
          {currentTimer ? formatTime(currentTimer.minutes, currentTimer.seconds) : '00:00'}
        </Text>

        {/* Timer label */}
        {currentTimer?.label && (
          <Text style={[styles.labelText, styles.timerLabel]} numberOfLines={1}>
            {currentTimer.label}
          </Text>
        )}

        {/* Progress indicator */}
        {currentProgress > 0 && (
          <Text style={[styles.progressText, styles.timerSubtext]}>
            {Math.round(currentProgress)}% complete
          </Text>
        )}

        {/* Session progress */}
        {timers.length > 1 && currentTimerIndex >= 0 && (
          <Text style={[styles.sessionText, styles.timerSubtext]}>
            Timer {currentTimerIndex + 1} of {timers.length}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '50%',
    height: '50%',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
  },
  completedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 36,
    fontWeight: '200',
    fontFamily: 'System',
    textAlign: 'center',
    letterSpacing: -1,
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    // Additional shadow layers for better depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    maxWidth: 120,
  },
  timerLabel: {
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timerSubtext: {
    color: '#FFFFFF',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.5,
  },
  sessionText: {
    fontSize: 10,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.5,
  },
});