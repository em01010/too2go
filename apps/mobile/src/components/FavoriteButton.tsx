import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useFavorites, useToggleFavorite } from '@/lib/queries';

export function FavoriteButton({ merchantId, label }: { merchantId: string; label?: boolean }) {
  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const isFavorite = favorites.data?.has(merchantId) ?? false;
  return (
    <Pressable
      accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      onPress={() => toggle.mutate({ merchantId, isFavorite })}
      disabled={toggle.isPending}
      style={[styles.btn, label && styles.withLabel]}
    >
      <Text style={[styles.heart, isFavorite && styles.on]}>{isFavorite ? '♥' : '♡'}</Text>
      {label ? <Text style={styles.label}>{isFavorite ? 'Favorito' : 'Guardar'}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  withLabel: { width: 'auto', paddingHorizontal: 12, borderRadius: radius.pill },
  heart: { fontSize: 20, color: colors.textMuted, lineHeight: 22 },
  on: { color: colors.danger },
  label: { fontSize: 14, color: colors.text, fontWeight: '600' },
});
