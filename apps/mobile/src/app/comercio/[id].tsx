import { formatFecha, t } from '@too2go/shared';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { BackButton } from '@/app/oferta/[id]';
import { FavoriteButton } from '@/components/FavoriteButton';
import { OfferCard } from '@/components/OfferCard';
import {
  Body,
  Button,
  Card,
  Divider,
  Empty,
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
import { useMerchant, useMerchantReviews, useOfferFeed } from '@/lib/queries';

export default function Comercio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const merchant = useMerchant(id);
  const reviews = useMerchantReviews(id);
  const feed = useOfferFeed();

  const todays = useMemo(
    () => (feed.data ?? []).filter((o) => o.merchant_id === id),
    [feed.data, id],
  );

  const stats = useMemo(() => {
    const list = reviews.data ?? [];
    const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    const counts = new Map<string, number>();
    for (const r of list) for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { avg, count: list.length, top };
  }, [reviews.data]);

  if (merchant.isLoading) return <Loading />;
  const m = merchant.data;
  if (!m) {
    return (
      <Screen>
        <BackButton />
        <Empty title={t.comun.errorGenerico} />
      </Screen>
    );
  }

  const openMaps = () => {
    const q = `${m.lat},${m.lng}`;
    void Linking.openURL(
      Platform.select({
        ios: `maps://?daddr=${q}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
      }),
    );
  };
  const wa = (m.whatsapp ?? '').replace(/\D/g, '');

  return (
    <Screen>
      <BackButton />
      <Row>
        <View style={styles.flex}>
          <Muted>{t.categorias[m.category]}</Muted>
          <Title>{m.name}</Title>
        </View>
        <FavoriteButton merchantId={m.id} label />
      </Row>
      <Row style={styles.ratingRow}>
        <Text style={styles.rating}>{stats.count ? `★ ${stats.avg.toFixed(1)}` : '★ –'}</Text>
        <Muted>{stats.count ? t.oferta.resenas(stats.count) : t.oferta.sinResenas}</Muted>
      </Row>
      {m.description ? <Body style={styles.desc}>{m.description}</Body> : null}

      <Card style={styles.block}>
        <Label>{t.comercio.direccion}</Label>
        <Body>{m.address}</Body>
        {m.zone ? <Muted>{m.zone}</Muted> : null}
        {m.has_parking ? <Muted>🅿️ {t.oferta.estacionamiento}</Muted> : null}
        <Pressable onPress={openMaps} style={styles.link}>
          <Text style={styles.linkText}>{t.oferta.comoLlegar} →</Text>
        </Pressable>
        {m.pickup_instructions ? (
          <>
            <Divider />
            <Label>{t.comercio.instrucciones}</Label>
            <Body>{m.pickup_instructions}</Body>
          </>
        ) : null}
        {wa ? (
          <Button
            title={t.comercio.escribir}
            variant="secondary"
            style={styles.waBtn}
            onPress={() => void Linking.openURL(`https://wa.me/${wa}`)}
          />
        ) : null}
      </Card>

      <Subtitle style={styles.section}>{t.comercio.bolsasHoy}</Subtitle>
      {todays.length === 0 ? (
        <Muted style={styles.empty}>{t.comercio.sinBolsasHoy}</Muted>
      ) : (
        todays.map((o) => <OfferCard key={o.id ?? ''} offer={o} />)
      )}

      <Subtitle style={styles.section}>{t.comercio.resenas}</Subtitle>
      {stats.top.length > 0 ? (
        <View>
          <Label>{t.comercio.destacan}</Label>
          <Row style={styles.tags}>
            {stats.top.map(([tag, n]) => (
              <Pill key={tag} tone="success">
                {t.pedido.resenaTags[tag] ?? tag} · {n}
              </Pill>
            ))}
          </Row>
        </View>
      ) : null}
      {(reviews.data ?? []).length === 0 ? (
        <Muted style={styles.empty}>{t.comercio.sinResenas}</Muted>
      ) : (
        (reviews.data ?? []).map((r) => (
          <Card key={r.id} style={styles.review}>
            <Row>
              <Text style={styles.stars}>{'★'.repeat(r.rating)}</Text>
              <Muted>
                {r.customer_first_name} · {formatFecha(r.created_at)}
              </Muted>
            </Row>
            {r.comment ? <Body>{r.comment}</Body> : null}
          </Card>
        ))
      )}
      <View style={styles.bottom}>
        <Button title={t.comun.volver} variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  ratingRow: { marginTop: spacing.xs },
  rating: { fontSize: 18, fontWeight: '700', color: colors.accent },
  desc: { marginTop: spacing.sm },
  block: { marginTop: spacing.md },
  link: { marginTop: spacing.sm },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  waBtn: { marginTop: spacing.md },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { marginBottom: spacing.md },
  tags: { flexWrap: 'wrap', marginBottom: spacing.sm },
  review: { marginBottom: spacing.sm, gap: spacing.xs },
  stars: { color: colors.accent, fontSize: 16 },
  bottom: { marginTop: spacing.md },
});
