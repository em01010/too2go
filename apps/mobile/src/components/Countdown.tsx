import { formatCuentaRegresiva } from '@too2go/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';

interface Props {
  /** Instante ISO en el que vence la reserva. */
  until: string;
  onExpire?: () => void;
}

export function Countdown({ until, onExpire }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.round((new Date(until).getTime() - now) / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0) onExpire?.();
  }, [left, onExpire]);

  return (
    <Text style={[styles.text, left <= 60 && styles.urgent]}>{formatCuentaRegresiva(left)}</Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 44, fontWeight: '700', color: colors.primary, fontVariant: ['tabular-nums'] },
  urgent: { color: colors.danger },
});
