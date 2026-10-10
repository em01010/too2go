import { normalizarTelefonoHN, t } from '@too2go/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Input } from '@/components/Input';
import { Button, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isLocal = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\./.test(env.supabaseUrl);

  const send = async () => {
    const e164 = normalizarTelefonoHN(phoneInput);
    if (!e164) {
      setError(t.login.telefonoInvalido);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendOtp(e164);
      setPhone(e164);
      setStep('code');
    } catch {
      setError(t.comun.errorGenerico);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 6) {
      setError(t.login.codigoInvalido);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyOtp(phone, code.trim());
      // La navegación la resuelve el guard de sesión en _layout + index.
    } catch {
      setError(t.login.codigoInvalido);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Title>{step === 'phone' ? t.login.titulo : t.login.codigoTitulo}</Title>
        <Muted style={styles.sub}>
          {step === 'phone' ? t.login.subtitulo : t.login.codigoSubtitulo(phone)}
        </Muted>
      </View>

      {step === 'phone' ? (
        <>
          <Input
            label={t.login.telefono}
            placeholder={t.login.telefonoPlaceholder}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phoneInput}
            onChangeText={setPhoneInput}
            onSubmitEditing={() => void send()}
            autoFocus
          />
          <ErrorText>{error}</ErrorText>
          <Button title={t.login.enviarCodigo} onPress={() => void send()} loading={busy} />
          {isLocal ? <Muted style={styles.hint}>{t.login.localHint}</Muted> : null}
          <Muted style={styles.terms}>{t.login.terminos}</Muted>
        </>
      ) : (
        <>
          <Input
            label={t.login.codigoTitulo}
            placeholder={t.login.codigoPlaceholder}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            onSubmitEditing={() => void verify()}
            autoFocus
          />
          <ErrorText>{error}</ErrorText>
          <Button title={t.login.verificar} onPress={() => void verify()} loading={busy} />
          <View style={styles.links}>
            <Button
              title={t.login.reenviar}
              variant="ghost"
              onPress={() => void send()}
              disabled={busy}
            />
            <Button
              title={t.login.cambiarNumero}
              variant="ghost"
              onPress={() => {
                setStep('phone');
                setCode('');
                setError('');
              }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.lg },
  sub: { marginTop: spacing.sm, fontSize: 16 },
  hint: { marginTop: spacing.md, textAlign: 'center' },
  terms: { marginTop: spacing.lg, textAlign: 'center', fontSize: 12 },
  links: { marginTop: spacing.sm },
});
