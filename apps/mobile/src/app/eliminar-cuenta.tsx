import { t } from '@too2go/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Body, Button, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useDeleteAccount } from '@/lib/queries';
import { FunctionError } from '@/lib/supabase';

export default function EliminarCuenta() {
  const { signOut } = useAuth();
  const del = useDeleteAccount();
  const [error, setError] = useState('');

  const confirm = () => {
    Alert.alert(t.eliminarCuenta.titulo, t.eliminarCuenta.advertencia, [
      { text: t.comun.cancelar, style: 'cancel' },
      {
        text: t.eliminarCuenta.confirmar,
        style: 'destructive',
        onPress: () =>
          del.mutate(undefined, {
            onSuccess: () => {
              Alert.alert(t.eliminarCuenta.listo);
              void signOut();
            },
            onError: (e) => {
              const code = e instanceof FunctionError ? e.code : '';
              setError(
                code === 'has_pending_orders'
                  ? t.eliminarCuenta.tienePendientes
                  : t.comun.errorGenerico,
              );
            },
          }),
      },
    ]);
  };

  return (
    <Screen
      footer={
        <>
          <Button
            title={t.eliminarCuenta.confirmar}
            variant="danger"
            onPress={confirm}
            loading={del.isPending}
          />
          <Button title={t.comun.cancelar} variant="ghost" onPress={() => router.back()} />
        </>
      }
    >
      <Title style={styles.title}>{t.eliminarCuenta.titulo}</Title>
      <Body>{t.eliminarCuenta.texto}</Body>
      <Muted style={styles.warn}>{t.eliminarCuenta.advertencia}</Muted>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.md, marginBottom: spacing.md },
  warn: { marginTop: spacing.md, color: colors.danger, fontWeight: '600' },
});
