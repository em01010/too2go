import { t } from '@too2go/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Input } from '@/components/Input';
import { Button, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function Nombre() {
  const { profile, updateName } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const clean = name.trim();
    if (clean.length < 2) return;
    setBusy(true);
    setError('');
    try {
      await updateName(clean);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch {
      setError(t.comun.errorGenerico);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Title>{t.nombre.titulo}</Title>
        <Muted style={styles.sub}>{t.nombre.subtitulo}</Muted>
      </View>
      <Input
        placeholder={t.nombre.placeholder}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoFocus
        onSubmitEditing={() => void save()}
      />
      <ErrorText>{error}</ErrorText>
      <Button
        title={t.nombre.guardar}
        onPress={() => void save()}
        loading={busy}
        disabled={name.trim().length < 2}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.lg },
  sub: { marginTop: spacing.sm, fontSize: 16 },
});
