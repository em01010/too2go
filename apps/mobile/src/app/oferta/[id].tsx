import { discountPercent, formatFranja, formatLempiras, t } from '@too2go/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { FavoriteButton } from '@/components/FavoriteButton';
import { QuantityStepper } from '@/components/QuantityStepper';
import {
  Body,
  Button,
  Card,
  Divider,
  Empty,
  ErrorText,
  Label,
  Loading,
  Muted,
  Pill,
  Row,
  Screen,
  Subtitle,
  Title,
} from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useOffer, useReserveOrder } from '@/lib/queries';
import { rpcErrorCode } from '@/lib/supabase';

export default function Oferta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offer = useOffer(id);
  const reserve = useReserveOrder();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  if (offer.isLoading) return <Loading />;
  if (!offer.data) {
    return (
      <Screen>
        <BackButton />
        <Empty
          title={t.oferta.noDisponible}
          action={<Button title={t.comun.volver} onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const o = offer.data;
  const available = o.quantity_available ?? 0;
  const max = Math.min(5, Math.max(available, 1));
  const price = Number(o.price_hnl ?? 0);
  const original = Number(o.original_value_hnl ?? 0);
  const total = price * qty;
  const soldOut = available <= 0;

  const openMaps = () => {
    const q = `${o.lat},${o.lng}`;
    const url = Platform.select({
      ios: `maps://?daddr=${q}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    });
    void Linking.openURL(url);
  };

  const onReserve = async () => {
    setError('');
    try {
      const order = await reserve.mutateAsync({ offerId: o.id ?? '', quantity: qty });
      router.replace({ pathname: '/checkout/[orderId]', params: { orderId: order.id } });
    } catch (e) {
      const code = rpcErrorCode(e);
      setError(t.oferta.errores[code] ?? t.comun.errorGenerico);
      void offer.refetch();
    }
  };

  return (
    <Screen
      footer={
        <View>
          <ErrorText>{error}</ErrorText>
          <Row style={styles.footerRow}>
            <QuantityStepper value={qty} min={1} max={max} onChange={setQty} />
            <Button
              style={styles.flex}
              title={soldOut ? t.oferta.agotada : t.oferta.reservar(formatLempiras(total))}
              disabled={soldOut}
              loading={reserve.isPending}
              onPress={() => void onReserve()}
            />
          </Row>
        </View>
      }
    >
      <Row>
        <View style={styles.flex}>
          <BackButton />
        </View>
        <Pressable
          onPress={() =>
            void Share.share({
              message: t.oferta.compartirTexto(
                o.title ?? '',
                o.merchant_name ?? '',
                formatLempiras(price),
              ),
            })
          }
          style={styles.shareBtn}
        >
          <Text style={styles.link}>{t.oferta.compartir}</Text>
        </Pressable>
        <FavoriteButton merchantId={o.merchant_id ?? ''} />
      </Row>
      <Pressable
        onPress={() =>
          router.push({ pathname: '/comercio/[id]', params: { id: o.merchant_id ?? '' } })
        }
      >
        <Muted>
          {o.merchant_name} · {t.oferta.verComercio} →
        </Muted>
      </Pressable>
      <Title>{o.title}</Title>
      {(o.dietary_tags ?? []).length > 0 ? (
        <Row style={styles.tags}>
          {(o.dietary_tags ?? []).map((d) => (
            <Pill key={d} tone="success">
              {t.oferta.dietas[d] ?? d}
            </Pill>
          ))}
        </Row>
      ) : null}
      <Row style={styles.priceRow}>
        <Text style={styles.price}>{formatLempiras(price)}</Text>
        <Text style={styles.original}>{formatLempiras(original)}</Text>
        <Pill tone="accent">{t.descubrir.descuento(discountPercent(price, original))}</Pill>
        <View style={styles.flex} />
        <Pill tone={soldOut ? 'neutral' : 'success'}>
          {soldOut ? t.descubrir.agotado : t.oferta.disponibles(available)}
        </Pill>
      </Row>

      <Card style={styles.block}>
        <Label>{t.oferta.recogida}</Label>
        <Subtitle>
          {o.pickup_start && o.pickup_end ? formatFranja(o.pickup_start, o.pickup_end) : ''}
        </Subtitle>
        <Muted>{t.comun.hoy}</Muted>
        <Divider />
        <Label>{t.oferta.direccion}</Label>
        <Body>{o.address}</Body>
        {o.zone ? <Muted>{o.zone}</Muted> : null}
        {o.has_parking ? <Muted>🅿️ {t.oferta.estacionamiento}</Muted> : null}
        <Pressable onPress={openMaps} style={styles.mapsLink}>
          <Text style={styles.link}>{t.oferta.comoLlegar} →</Text>
        </Pressable>
        {o.pickup_instructions ? (
          <>
            <Divider />
            <Label>{t.oferta.instruccionesRecogida}</Label>
            <Body>{o.pickup_instructions}</Body>
          </>
        ) : null}
      </Card>

      <Card style={styles.block}>
        <Label>{t.oferta.queTrae}</Label>
        <Body>{o.description || t.oferta.queTraeTexto}</Body>
        {o.allergens_note ? (
          <>
            <Divider />
            <Label>{t.oferta.alergenos}</Label>
            <Body>{o.allergens_note}</Body>
          </>
        ) : null}
      </Card>

      <Card style={styles.block}>
        <Row>
          <Subtitle>{o.merchant_name}</Subtitle>
          <View style={styles.flex} />
          <Muted>
            {o.rating_count
              ? `★ ${Number(o.rating_avg ?? 0).toFixed(1)} · ${t.oferta.resenas(Number(o.rating_count))}`
              : t.oferta.sinResenas}
          </Muted>
        </Row>
        <Muted>{t.categorias[o.category ?? 'otro']}</Muted>
      </Card>
    </Screen>
  );
}

export function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      style={styles.back}
    >
      <Text style={styles.link}>← {t.comun.volver}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { paddingVertical: spacing.sm, marginBottom: spacing.xs },
  link: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  priceRow: { marginTop: spacing.sm, marginBottom: spacing.md },
  tags: { flexWrap: 'wrap', marginTop: spacing.xs },
  shareBtn: { paddingHorizontal: spacing.sm },
  price: { fontSize: 28, fontWeight: '700', color: colors.accent },
  original: { fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' },
  block: { marginBottom: spacing.md },
  mapsLink: { marginTop: spacing.sm },
  footerRow: { gap: spacing.md },
});
