import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

const BG = '#0E0C0B';
const INK = '#EDE7E1';
const WINE = '#A8325A';

/**
 * מסך פתיחה ממותג — אנימציית לוגו AVIVSAMSA PPC בהפעלה הראשונה של האפליקציה.
 * מוצג פעם אחת לכל cold-start, ואז נעלם בהדרגה וחושף את האפליקציה.
 */
export function BrandSplash() {
  const [hidden, setHidden] = useState(false);
  const iconScale = useRef(new Animated.Value(0.82)).current;
  const iconOp = useRef(new Animated.Value(0)).current;
  const wordOp = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(12)).current;
  const ppcOp = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      Animated.timing(overlay, { toValue: 0, duration: 440, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
        if (!cancelled) setHidden(true);
      });
    };

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        iconScale.setValue(1); iconOp.setValue(1); wordOp.setValue(1); wordY.setValue(0); ppcOp.setValue(1);
        setTimeout(finish, 1100);
        return;
      }
      Animated.sequence([
        Animated.parallel([
          Animated.spring(iconScale, { toValue: 1, stiffness: 140, damping: 13, mass: 0.9, useNativeDriver: true }),
          Animated.timing(iconOp, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(wordOp, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.spring(wordY, { toValue: 0, stiffness: 120, damping: 15, useNativeDriver: true }),
        ]),
        Animated.timing(ppcOp, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(560),
      ]).start(() => { if (!cancelled) finish(); });
    });

    return () => { cancelled = true; };
  }, []);

  if (hidden) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.wrap, { opacity: overlay }]} pointerEvents="none">
      <Animated.Image
        source={require('../assets/icon.png')}
        style={[s.icon, { opacity: iconOp, transform: [{ scale: iconScale }] }]}
      />
      <Animated.View style={{ opacity: wordOp, transform: [{ translateY: wordY }], alignItems: 'center' }}>
        <Text style={s.word}>AVIVSAMSA</Text>
      </Animated.View>
      <Animated.Text style={[s.ppc, { opacity: ppcOp }]}>PPC</Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: BG, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  icon: { width: 96, height: 96, borderRadius: 24, marginBottom: 22 },
  word: { color: INK, fontSize: 26, fontWeight: '800', letterSpacing: 4 },
  ppc: { color: WINE, fontSize: 15, fontWeight: '800', letterSpacing: 8, marginTop: 8 },
});
