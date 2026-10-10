import { t } from '@too2go/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { markOnboardingSeen } from '@/lib/storage';

const { width } = Dimensions.get('window');
const emojis = ['🥐', '💸', '🌱'];
type Slide = (typeof t.onboarding.slides)[number];
const slides: Slide[] = [...t.onboarding.slides];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const last = index === slides.length - 1;

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/login');
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button
            title={last ? t.onboarding.empezar : t.comun.continuar}
            onPress={() => {
              if (last) void finish();
              else list.current?.scrollToIndex({ index: index + 1 });
            }}
          />
          {!last ? (
            <Button title={t.onboarding.saltar} variant="ghost" onPress={() => void finish()} />
          ) : null}
        </View>
      }
    >
      <FlatList
        ref={list}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(s) => s.titulo}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.hero}>
              <Text style={styles.emoji}>{emojis[i]}</Text>
            </View>
            <Title style={styles.center}>{item.titulo}</Title>
            <Muted style={[styles.center, styles.text]}>{item.texto}</Muted>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  hero: {
    width: 180,
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emoji: { fontSize: 88 },
  center: { textAlign: 'center' },
  text: { fontSize: 16, marginTop: spacing.sm, maxWidth: 320 },
  footer: { gap: spacing.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 20 },
});
