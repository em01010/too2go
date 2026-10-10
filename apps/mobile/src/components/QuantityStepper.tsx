import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}

export function QuantityStepper({ value, min, max, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel="Menos"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.btn, value <= min && styles.disabled]}
      >
        <Text style={styles.sign}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityLabel="Más"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.btn, value >= max && styles.disabled]}
      >
        <Text style={styles.sign}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  sign: { fontSize: 24, color: colors.primaryDark, fontWeight: '600', lineHeight: 28 },
  value: { fontSize: 22, fontWeight: '700', minWidth: 28, textAlign: 'center', color: colors.text },
});
