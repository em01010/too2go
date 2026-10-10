import { formatLempiras, t } from '@too2go/shared';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Countdown } from '@/components/Countdown';
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
  Row,
  Screen,
  Subtitle,
  Title,
} from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useCancelOrder, useCreatePayment, useOrder } from '@/lib/queries';

export default function Checkout() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const order = useOrder(orderId, { poll: true });
  const createPayment = useCreatePayment();
  const cancel = useCancelOrder();
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  // Si el pago se confirmó (por el webhook), pasamos a la pantalla del pedido.
  useEffect(() => {
    if (order.data?.status === 'paid') {
      router.replace({ pathname: '/pedido/[id]', params: { id: order.data.id } });
    }
  }, [order.data?.status, order.data?.id]);

  const onExpire = useCallback(() => setExpired(true), []);

  const pay = async () => {
    if (!order.data) return;
    setError('');
    try {
      const returnUrl = Linking.createURL(`/pedido/${order.data.id}`);
      const { checkoutUrl } = await createPayment.mutateAsync({
        orderId: order.data.id,
        returnUrl,
      });
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
      await order.refetch();
      if (result.type === 'success' && result.url.includes('pago=fallo')) {
        setError(t.checkout.pagoFallo);
      }
    } catch {
      setError(t.comun.errorGenerico);
    }
  };

  const onCancel = () => {
    if (!order.data) return;
    Alert.alert(t.checkout.cancelarReserva, t.checkout.cancelarReservaConfirm, [
      { text: t.comun.no, style: 'cancel' },
      {
        text: t.comun.si,
        style: 'destructive',
        onPress: () => {
          cancel.mutate(order.data?.id ?? '', {
            onSuccess: () => router.replace('/(tabs)'),
            onError: () => setError(t.comun.errorGenerico),
          });
        },
      },
    ]);
  };

  if (order.isLoading) return <Loading />;
  const o = order.data;
  if (!o)
    return (
      <Screen>
        <Empty title={t.comun.errorGenerico} />
      </Screen>
    );

  const isPending = o.status === 'pending_payment' && !expired;
  const gone = o.status !== 'pending_payment' && o.status !== 'paid';

  if (expired || gone) {
    return (
      <Screen>
        <Title>{t.checkout.titulo}</Title>
        <Body style={styles.expired}>{t.checkout.reservaVencida}</Body>
        <Button
          title={t.checkout.volverOferta}
          onPress={() => router.replace({ pathname: '/oferta/[id]', params: { id: o.offer_id } })}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View>
          <ErrorText>{error}</ErrorText>
          <Button
            title={t.checkout.pagar(formatLempiras(o.total_hnl))}
            onPress={() => void pay()}
            loading={createPayment.isPending}
            disabled={!isPending}
          />
          <Button
            title={t.checkout.cancelarReserva}
            variant="ghost"
            onPress={onCancel}
            disabled={cancel.isPending}
          />
        </View>
      }
    >
      <Title>{t.checkout.titulo}</Title>

      <Card style={styles.timer}>
        <Label>{t.checkout.reservaHasta}</Label>
        {o.reservation_expires_at ? (
          <Countdown until={o.reservation_expires_at} onExpire={onExpire} />
        ) : null}
      </Card>

      <Card style={styles.block}>
        <Label>{t.checkout.resumen}</Label>
        <Subtitle>{o.merchant_name}</Subtitle>
        <Muted>{o.offer_title}</Muted>
        <Divider />
        <Row style={styles.line}>
          <Body>
            {o.quantity} × {formatLempiras(o.total_hnl / o.quantity)}
          </Body>
          <Body>{formatLempiras(o.total_hnl)}</Body>
        </Row>
        <Row style={styles.line}>
          <Subtitle>{t.checkout.total}</Subtitle>
          <Subtitle style={styles.total}>{formatLempiras(o.total_hnl)}</Subtitle>
        </Row>
      </Card>

      <Muted>{t.checkout.aviso}</Muted>
      {order.isRefetching && !isPending ? <Muted>{t.checkout.esperandoConfirmacion}</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  timer: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md },
  block: { marginBottom: spacing.md },
  line: { justifyContent: 'space-between' },
  total: { color: colors.accent },
  expired: { marginVertical: spacing.lg },
});
