import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, type ViewStyle } from 'react-native';

/**
 * FadeIn — כניסה עדינה: opacity 0→1 + החלקה כלפי מעלה עם spring.
 * delay/index לסטגר. מכבד reduced-motion (מדלג על התנועה).
 */
export function FadeIn({
  children,
  delay = 0,
  index,
  offset = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  index?: number;
  offset?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;
  const d = delay + (index != null ? index * 60 : 0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 380,
          delay: d,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          delay: d,
          stiffness: 130,
          damping: 15,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
  );
}

/**
 * PressableScale — משוב לחיצה: כיווץ עדין (0.97) עם spring. תמיד אינטראקטיבי.
 */
export function PressableScale({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, stiffness: 320, damping: 22, mass: 0.6, useNativeDriver: true }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
