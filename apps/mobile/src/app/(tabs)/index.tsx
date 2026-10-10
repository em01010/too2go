import { formatLempiras, t } from '@too2go/shared';
import type { OfferFeedItem } from '@too2go/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { OfferCard } from '@/components/OfferCard';
import { Button, Empty, Loading, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { distanceMeters, TEGUCIGALPA, useUserLocation } from '@/lib/location';
import { useOfferFeed } from '@/lib/queries';

type Mode = 'list' | 'map';

export default function Descubrir() {
  const [mode, setMode] = useState<Mode>('list');
  const feed = useOfferFeed();
  const { coords, denied, request } = useUserLocation();

  const items = useMemo(() => {
    const list = (feed.data ?? []).map((o) => ({
      offer: o,
      distance:
        coords && o.lat != null && o.lng != null
          ? distanceMeters(coords, { lat: o.lat, lng: o.lng })
          : null,
    }));
    if (coords) list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return list;
  }, [feed.data, coords]);

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
          ListEmptyComponent={<Empty title={t.descubrir.vacio} />}
          renderItem={({ item }) => <OfferCard offer={item.offer} distanceMeters={item.distance} />}
        />
      ) : (
        <OffersMap offers={feed.data ?? []} center={coords ?? TEGUCIGALPA} />
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
            pinColor={colors.primary}
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
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 },
});
