import { formatLempiras, t } from '@too2go/shared';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Divider, Label, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAuth } from '@/lib/auth';
import { useMyOrders } from '@/lib/queries';

export default function Perfil() {
  const { profile, session, signOut } = useAuth();
  const orders = useMyOrders();

  const impact = useMemo(() => {
    const picked = (orders.data ?? []).filter((o) => o.status === 'picked_up');
    return {
      saved: picked.reduce((s, o) => s + Number(o.saved_hnl ?? 0), 0),
      bags: picked.reduce((s, o) => s + o.quantity, 0),
    };
  }, [orders.data]);

  const whatsapp = env.supportWhatsapp.replace(/\D/g, '');
  const phone = profile?.phone ?? session?.user.phone ?? '';

  const confirmSignOut = () => {
    Alert.alert(t.perfil.cerrarSesion, undefined, [
      { text: t.comun.cancelar, style: 'cancel' },
      { text: t.perfil.cerrarSesion, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen>
      <Title>{t.perfil.titulo}</Title>

      <Card style={styles.impact}>
        <Label style={styles.impactLabel}>{t.perfil.ahorroTitulo}</Label>
        <View style={styles.impactRow}>
          <View style={styles.flex}>
            <Text style={styles.big}>{formatLempiras(impact.saved)}</Text>
            <Muted style={styles.impactMuted}>{t.perfil.ahorrado}</Muted>
          </View>
          <View style={styles.flex}>
            <Text style={styles.big}>{impact.bags}</Text>
            <Muted style={styles.impactMuted}>{t.perfil.bolsasRescatadas}</Muted>
          </View>
        </View>
      </Card>

      <Card style={styles.block}>
        <Label>{t.perfil.nombre}</Label>
        <View style={styles.nameRow}>
          <Subtitle style={styles.flex}>{profile?.full_name || t.perfil.sinNombre}</Subtitle>
          <Link href="/nombre" asChild>
            <Pressable>
              <Text style={styles.link}>{t.perfil.editarNombre}</Text>
            </Pressable>
          </Link>
        </View>
        <Divider />
        <Label>{t.perfil.telefono}</Label>
        <Subtitle>{phone.startsWith('+') ? phone : `+${phone}`}</Subtitle>
      </Card>

      <View style={styles.actions}>
        {whatsapp ? (
          <Button
            title={t.perfil.soporte}
            variant="secondary"
            onPress={() => void Linking.openURL(`https://wa.me/${whatsapp}`)}
          />
        ) : null}
        <Button title={t.perfil.cerrarSesion} variant="ghost" onPress={confirmSignOut} />
        <Link href="/eliminar-cuenta" asChild>
          <Pressable style={styles.deleteBtn}>
            <Text style={styles.deleteText}>{t.perfil.eliminarCuenta}</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  impact: { marginTop: spacing.md, backgroundColor: colors.primary, borderColor: colors.primary },
  impactLabel: { color: colors.primarySoft },
  impactMuted: { color: colors.primarySoft },
  impactRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.md },
  big: { fontSize: 28, fontWeight: '700', color: '#fff' },
  block: { marginTop: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  link: { color: colors.primary, fontWeight: '600' },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  deleteBtn: { alignItems: 'center', padding: spacing.md },
  deleteText: { color: colors.danger, fontWeight: '600' },
});
