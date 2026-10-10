import { discountPercent, formatDistancia, formatFranja, formatLempiras, t } from '@too2go/shared';
import type { OfferFeedItem } from '@too2go/shared';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Muted, Pill, Row } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';

interface Props {
  offer: OfferFeedItem;
  distanceMeters?: number | null;
}

export function OfferCard({ offer, distanceMeters }: Props) {
  const available = offer.quantity_available ?? 0;
  const soldOut = available <= 0;
  const price = Number(offer.price_hnl ?? 0);
  const original = Number(offer.original_value_hnl ?? 0);
  return (
    <Link href={{ pathname: '/oferta/[id]', params: { id: offer.id ?? '' } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(offer.merchant_name ?? '?').slice(0, 1)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.merchant} numberOfLines={1}>
              {offer.merchant_name}
            </Text>
            <Muted numberOfLines={1}>
              {[offer.zone, formatDistancia(distanceMeters)].filter(Boolean).join(' · ')}
            </Muted>
          </View>
          {soldOut ? (
            <Pill tone="neutral">{t.descubrir.agotado}</Pill>
          ) : (
            <Pill tone={available <= 2 ? 'accent' : 'success'}>
              {t.descubrir.quedan(available)}
            </Pill>
          )}
        </View>
        <Text style={styles.title}>{offer.title}</Text>
        <Row style={styles.footer}>
          <View style={styles.flex}>
            <Muted>
              {t.descubrir.recogida}{' '}
              {offer.pickup_start && offer.pickup_end
                ? formatFranja(offer.pickup_start, offer.pickup_end)
                : ''}
            </Muted>
            {offer.rating_count ? (
              <Muted>
                ★ {Number(offer.rating_avg ?? 0).toFixed(1)} ({offer.rating_count})
              </Muted>
            ) : null}
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>{formatLempiras(price)}</Text>
            <Text style={styles.original}>{formatLempiras(original)}</Text>
          </View>
          <Pill tone="accent">{t.descubrir.descuento(discountPercent(price, original))}</Pill>
        </Row>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.9 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primaryDark, fontWeight: '700', fontSize: 18 },
  flex: { flex: 1 },
  merchant: { fontSize: 16, fontWeight: '600', color: colors.text },
  title: { fontSize: 17, color: colors.text, marginBottom: spacing.sm },
  footer: { justifyContent: 'space-between' },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: '700', color: colors.accent },
  original: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'line-through' },
});
