import { formatFecha, formatFranja, formatLempiras, t } from '@too2go/shared';
import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { Button, Empty, Label, Loading, Muted, Screen, Title } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useMyOrders, type OrderSummary } from '@/lib/queries';

const ACTIVE = new Set(['pending_payment', 'paid']);

export default function Pedidos() {
  const orders = useMyOrders();

  const sections = useMemo(() => {
    const all = orders.data ?? [];
    const activos = all.filter((o) => ACTIVE.has(o.status));
    const anteriores = all.filter((o) => !ACTIVE.has(o.status));
    return [
      { title: t.historial.activos, data: activos },
      { title: t.historial.anteriores, data: anteriores },
    ].filter((s) => s.data.length > 0);
  }, [orders.data]);

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <Title>{t.historial.titulo}</Title>
      </View>
      {orders.isLoading ? (
        <Loading />
      ) : sections.length === 0 ? (
        <Empty
          title={t.historial.vacio}
          action={
            <Button title={t.historial.irADescubrir} onPress={() => router.replace('/(tabs)')} />
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          refreshing={orders.isRefetching}
          onRefresh={() => void orders.refetch()}
          renderSectionHeader={({ section }) => (
            <Label style={styles.section}>{section.title}</Label>
          )}
          renderItem={({ item }) => <OrderRow order={item} />}
        />
      )}
    </Screen>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const href =
    order.status === 'pending_payment'
      ? { pathname: '/checkout/[orderId]' as const, params: { orderId: order.id } }
      : { pathname: '/pedido/[id]' as const, params: { id: order.id } };
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
        <View style={styles.rowTop}>
          <Text style={styles.merchant} numberOfLines={1}>
            {order.merchant_name}
          </Text>
          <StatusBadge status={order.status} />
        </View>
        <Muted>
          {order.quantity} {order.quantity === 1 ? t.comun.bolsa : t.comun.bolsas} ·{' '}
          {order.offer_title}
        </Muted>
        <View style={styles.rowBottom}>
          <Muted>
            {formatFecha(order.pickup_start)} · {formatFranja(order.pickup_start, order.pickup_end)}
          </Muted>
          <Text style={styles.total}>{formatLempiras(order.total_hnl)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  section: { marginTop: spacing.sm, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  merchant: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  total: { fontSize: 16, fontWeight: '700', color: colors.accent },
});
