import { formatLempiras, t } from '@too2go/shared';
import type { OfferFeedItem } from '@too2go/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Chips } from '@/components/Chips';
import { OfferCard } from '@/components/OfferCard';
import { Button, Empty, Label, Loading, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { distanceMeters, TEGUCIGALPA, useUserLocation } from '@/lib/location';
import { useCommunityImpact, useFavorites, useOfferFeed } from '@/lib/queries';

type Mode = 'list' | 'map';
type Sort = 'cercania' | 'precio' | 'calificacion' | 'horario';

const SORTS: Sort[] = ['cercania', 'precio', 'calificacion', 'horario'];

export default function Descubrir() {
  const [mode, setMode] = useState<Mode>('list');
  const [filter, setFilter] = useState('todas');
  const [sort, setSort] = useState<Sort>('cercania');
  const feed = useOfferFeed();
  const favorites = useFavorites();
  const impact = useCommunityImpact();
  const { coords, denied, request } = useUserLocation();

  const categories = useMemo(() => {
    const set = new Set((feed.data ?? []).map((o) => o.category ?? 'otro'));
    return [
      { key: 'todas', label: t.descubrir.filtros.todas },
      { key: 'favoritos', label: `♥ ${t.descubrir.filtros.favoritos}` },
      ...[...set].map((c) => ({ key: c, label: t.categorias[c] ?? c })),
    ];
  }, [feed.data]);

  const items = useMemo(() => {
    let list = (feed.data ?? []).map((o) => ({
      offer: o,
      distance:
        coords && o.lat != null && o.lng != null
          ? distanceMeters(coords, { lat: o.lat, lng: o.lng })
          : null,
    }));
    if (filter === 'favoritos') {
      list = list.filter((i) => favorites.data?.has(i.offer.merchant_id ?? ''));
    } else if (filter !== 'todas') {
      list = list.filter((i) => i.offer.category === filter);
    }
    const avail = (i: (typeof list)[number]) => (i.offer.quantity_available ?? 0) > 0;
    list.sort((a, b) => {
      // Agotadas siempre al final
      if (avail(a) !== avail(b)) return avail(a) ? -1 : 1;
      switch (sort) {
        case 'precio':
          return Number(a.offer.price_hnl ?? 0) - Number(b.offer.price_hnl ?? 0);
        case 'calificacion':
          return Number(b.offer.rating_avg ?? 0) - Number(a.offer.rating_avg ?? 0);
        case 'horario':
          return (a.offer.pickup_start ?? '').localeCompare(b.offer.pickup_start ?? '');
        default:
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      }
    });
    return list;
  }, [feed.data, coords, filter, sort, favorites.data]);

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <Title>{t.descubrir.titulo}</Title>
        <View style={styles.toggle}>
          {(['list', 'map'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.toggleBtn, mode === m && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'list' ? t.descubrir.lista : t.descubrir.mapa}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {impact.data && impact.data.bags_rescued > 0 ? (
        <Muted style={styles.impact}>
          🌱 {t.descubrir.impacto(impact.data.bags_rescued, formatLempiras(impact.data.saved_hnl))}
        </Muted>
      ) : null}

      <Chips options={categories} value={filter} onChange={setFilter} />
      {mode === 'list' ? (
        <View style={styles.sortRow}>
          <Label>{t.descubrir.orden.titulo}</Label>
          <Chips
            options={SORTS.map((s) => ({ key: s, label: t.descubrir.orden[s] }))}
            value={sort}
            onChange={(k) => setSort(k as Sort)}
          />
        </View>
      ) : null}

      {denied ? (
        <View style={styles.banner}>
          <Muted style={styles.flex}>{t.descubrir.sinUbicacion}</Muted>
          <Button
            title={t.descubrir.permitirUbicacion}
            variant="secondary"
            onPress={() => void request()}
          />
        </View>
      ) : null}

      {feed.isLoading ? (
        <Loading />
      ) : feed.isError ? (
        <Empty
          title={t.comun.errorGenerico}
          action={<Button title={t.comun.reintentar} onPress={() => void feed.refetch()} />}
        />
      ) : mode === 'list' ? (
        <FlatList
          data={items}
          keyExtractor={(i) => i.offer.id ?? ''}
          contentContainerStyle={styles.list}
          refreshing={feed.isRefetching}
          onRefresh={() => void feed.refetch()}
          ListEmptyComponent={
            <Empty
              title={filter === 'favoritos' ? t.descubrir.filtros.sinFavoritos : t.descubrir.vacio}
            />
          }
          renderItem={({ item }) => <OfferCard offer={item.offer} distanceMeters={item.distance} />}
        />
      ) : (
        <OffersMap offers={items.map((i) => i.offer)} center={coords ?? TEGUCIGALPA} />
      )}
    </Screen>
  );
}

function OffersMap({
  offers,
  center,
}: {
  offers: OfferFeedItem[];
  center: { lat: number; lng: number };
}) {
  return (
    <MapView
      style={styles.flex}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }}
      showsUserLocation
    >
      {offers.map((o) =>
        o.lat != null && o.lng != null ? (
          <Marker
            key={o.id ?? ''}
            coordinate={{ latitude: o.lat, longitude: o.lng }}
            title={o.merchant_name ?? ''}
            description={`${formatLempiras(o.price_hnl)} · ${t.descubrir.quedan(o.quantity_available ?? 0)}`}
            pinColor={(o.quantity_available ?? 0) > 0 ? colors.primary : colors.textMuted}
            onCalloutPress={() =>
              router.push({ pathname: '/oferta/[id]', params: { id: o.id ?? '' } })
            }
          />
        ) : null,
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impact: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs, color: colors.primaryDark },
  sortRow: { marginTop: spacing.xs, paddingLeft: spacing.md },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  toggleTextActive: { color: colors.primaryDark },
  banner: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
});
