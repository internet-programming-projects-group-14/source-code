// components/QoEPopup.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface QoEPopupProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (rating: number) => void;
  triggerReason: 'periodic' | 'signal' | null;
}

const { width, height } = Dimensions.get('window');

export const QoEPopup: React.FC<QoEPopupProps> = ({
  visible,
  onClose,
  onEmojiSelect,
  triggerReason,
}) => {
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  const getMessage = (): string => {
    switch (triggerReason) {
      case 'signal':
        return 'We detected poor network conditions. How was your experience?';
      case 'periodic':
        return 'Help us improve by rating your recent network quality';
      default:
        return 'Rate your network experience';
    }
  };

  const emojiOptions = [
    { emoji: '😞', label: 'Poor', value: 1, color: '#f87171' },
    { emoji: '😐', label: 'Fair', value: 2, color: '#fb923c' },
    { emoji: '🙂', label: 'Good', value: 3, color: '#facc15' },
    { emoji: '😊', label: 'Great', value: 4, color: '#6ee7b7' },
    { emoji: '🤩', label: 'Excellent', value: 5, color: '#34d399' },
  ];

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{ scale: scaleValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={20} color="#6b7280" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Feather name="activity" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.title}>Network Feedback</Text>
            <Text style={styles.message}>{getMessage()}</Text>
          </View>

          <View style={styles.emojiContainer}>
            {emojiOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => onEmojiSelect(option.value)}
                style={styles.emojiButton}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{option.emoji}</Text>
                <Text style={[styles.emojiLabel, { color: option.color }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.footer}>
            Your feedback helps improve network quality for everyone
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 24,
    width: Math.min(width - 40, 360),
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e40af20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  emojiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  emojiButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#374151',
    minWidth: 52,
    flex: 1,
    marginHorizontal: 2,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});