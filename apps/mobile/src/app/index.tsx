import { esHN, formatLempiras } from '@too2go/shared';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{esHN.app.nombre}</Text>
      <Text style={styles.subtitle}>{esHN.app.eslogan}</Text>
      <Text style={styles.price}>{formatLempiras(90)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { fontSize: 32, fontWeight: '700', color: colors.primary },
  subtitle: { marginTop: spacing.sm, fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  price: { marginTop: spacing.lg, fontSize: 24, fontWeight: '600', color: colors.accent },
});
