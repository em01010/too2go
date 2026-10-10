import { formatFecha, formatFranja, formatLempiras, t } from '@too2go/shared';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { BackButton } from '@/app/oferta/[id]';
import { MultiChips } from '@/components/Chips';
import { StatusBadge } from '@/components/StatusBadge';
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
import { colors, radius, spacing } from '@/constants/theme';
import { env } from '@/lib/env';
import {
  useCancelOrder,
  useMerchant,
  useOrder,
  useSubmitReview,
  type OrderSummary,
} from '@/lib/queries';

export default function Pedido() {
  const { id } = useLocalSearchParams<{ id: string; pago?: string }>();
  const order = useOrder(id, { poll: false });
  const merchant = useMerchant(order.data?.merchant_id);
  const cancel = useCancelOrder();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());

  // Si todavía está pendiente de pago (ej. se abrió desde el deep link), volvemos al checkout.
  const pendingId = order.data?.status === 'pending_payment' ? order.data.id : null;
  useEffect(() => {
    if (pendingId) {
      router.replace({ pathname: '/checkout/[orderId]', params: { orderId: pendingId } });
    }
  }, [pendingId]);

  if (order.isLoading) return <Loading />;
  const o = order.data;
  if (!o)
    return (
      <Screen>
        <BackButton />
        <Empty title={t.comun.errorGenerico} />
      </Screen>
    );

  if (o.status === 'pending_payment') return <Loading />;

  const canCancel =
    o.status === 'paid' && now < new Date(o.pickup_start).getTime() - 2 * 60 * 60 * 1000;

  const onCancel = () => {
    Alert.alert(t.pedido.cancelar, t.pedido.cancelarConfirm, [
      { text: t.comun.no, style: 'cancel' },
      {
        text: t.comun.si,
        style: 'destructive',
        onPress: () =>
          cancel.mutate(o.id, {
            onError: () => setError(t.pedido.noSePudoCancelar),
          }),
      },
    ]);
  };

  const openMaps = () => {
    const q = `${o.merchant_lat},${o.merchant_lng}`;
    void Linking.openURL(
      Platform.select({
        ios: `maps://?daddr=${q}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
      }),
    );
  };

  const support = env.supportWhatsapp.replace(/\D/g, '');

  return (
    <Screen>
      <BackButton />
      <Row style={styles.titleRow}>
        <Title style={styles.flex}>{t.pedido.titulo}</Title>
        <StatusBadge status={o.status} />
      </Row>
      {t.pedido.estadoDetalle[o.status] ? <Muted>{t.pedido.estadoDetalle[o.status]}</Muted> : null}

      {o.status === 'paid' ? (
        <Card style={styles.codeCard}>
          <Label>{t.pedido.codigo}</Label>
          <Text style={styles.code}>{o.pickup_code}</Text>
          <View style={styles.qr}>
            <QRCode
              value={`too2go:${o.offer_id}:${o.pickup_code}`}
              size={180}
              color={colors.text}
              backgroundColor="#fff"
            />
          </View>
          <Muted style={styles.center}>{t.pedido.mostraCodigo}</Muted>
          <Pressable
            onPress={() => {
              void Clipboard.setStringAsync(o.pickup_code);
              setCopied(true);
            }}
          >
            <Text style={styles.link}>
              {copied ? t.pedido.codigoCopiado : t.pedido.copiarCodigo}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <Card style={styles.block}>
        <Label>{t.pedido.recogeEntre}</Label>
        <Subtitle>{formatFranja(o.pickup_start, o.pickup_end)}</Subtitle>
        <Muted>{formatFecha(o.pickup_start)}</Muted>
        <Divider />
        <Label>{t.pedido.comercio}</Label>
        <Subtitle>{o.merchant_name}</Subtitle>
        <Body>{o.merchant_address}</Body>
        <Pressable onPress={openMaps} style={styles.mapsLink}>
          <Text style={styles.link}>{t.oferta.comoLlegar} →</Text>
        </Pressable>
        {merchant.data?.pickup_instructions ? (
          <>
            <Divider />
            <Label>{t.oferta.instruccionesRecogida}</Label>
            <Body>{merchant.data.pickup_instructions}</Body>
          </>
        ) : null}
        <Divider />
        <Row style={styles.line}>
          <Body>{t.pedido.cantidad}</Body>
          <Body>
            {o.quantity} · {o.offer_title}
          </Body>
        </Row>
        <Row style={styles.line}>
          <Body>{t.pedido.pagado}</Body>
          <Subtitle style={styles.total}>{formatLempiras(o.total_hnl)}</Subtitle>
        </Row>
      </Card>

      {o.status === 'picked_up' && !o.has_review ? <ReviewForm order={o} /> : null}
      {o.status === 'picked_up' && o.has_review ? (
        <Muted style={styles.center}>{t.pedido.resenaGracias}</Muted>
      ) : null}

      <ErrorText>{error}</ErrorText>
      <View style={styles.actions}>
        {o.status === 'paid' ? (
          <Button
            title={t.pedido.pedirAmigo}
            variant="secondary"
            onPress={() =>
              void Share.share({
                message: t.pedido.pedirAmigoTexto(
                  o.merchant_name,
                  formatFranja(o.pickup_start, o.pickup_end),
                  o.pickup_code,
                  o.merchant_address,
                ),
              })
            }
          />
        ) : null}
        {o.merchant_whatsapp ? (
          <Button
            title={t.pedido.escribirComercio}
            variant="ghost"
            onPress={() =>
              void Linking.openURL(
                `https://wa.me/${(o.merchant_whatsapp ?? '').replace(/\D/g, '')}`,
              )
            }
          />
        ) : null}
        {canCancel ? (
          <Button
            title={t.pedido.cancelar}
            variant="ghost"
            onPress={onCancel}
            loading={cancel.isPending}
          />
        ) : null}
        {support ? (
          <Button
            title={t.pedido.ayuda}
            variant="secondary"
            onPress={() =>
              void Linking.openURL(
                `https://wa.me/${support}?text=${encodeURIComponent(`Hola, necesito ayuda con mi pedido ${o.id.slice(0, 8)} (${o.merchant_name}).`)}`,
              )
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

function ReviewForm({ order }: { order: OrderSummary }) {
  const submit = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const toggleTag = (k: string) =>
    setTags((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  return (
    <Card style={styles.block}>
      <Label>{t.pedido.dejarResena}</Label>
      <Subtitle>{t.pedido.resenaTitulo}</Subtitle>
      <Row style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} estrellas`}>
            <Text style={[styles.star, n <= rating && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </Row>
      <Label>{t.pedido.resenaQueDestacas}</Label>
      <View style={styles.tagsWrap}>
        <MultiChips
          options={Object.entries(t.pedido.resenaTags).map(([key, label]) => ({ key, label }))}
          values={tags}
          onToggle={toggleTag}
        />
      </View>
      <TextInput
        placeholder={t.pedido.resenaComentario}
        placeholderTextColor={colors.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
        style={styles.comment}
      />
      <Button
        title={t.pedido.resenaEnviar}
        disabled={rating === 0}
        loading={submit.isPending}
        onPress={() =>
          submit.mutate({ orderId: order.id, merchantId: order.merchant_id, rating, comment, tags })
        }
      />
      {submit.isError ? <ErrorText>{t.comun.errorGenerico}</ErrorText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { marginBottom: spacing.xs },
  codeCard: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  code: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 6,
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  qr: { padding: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md },
  center: { textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  block: { marginBottom: spacing.md },
  mapsLink: { marginTop: spacing.sm },
  line: { justifyContent: 'space-between' },
  total: { color: colors.accent },
  stars: { marginVertical: spacing.sm, gap: 4 },
  tagsWrap: { marginHorizontal: -spacing.md, marginBottom: spacing.sm },
  star: { fontSize: 34, color: colors.border },
  starOn: { color: colors.accent },
  comment: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
