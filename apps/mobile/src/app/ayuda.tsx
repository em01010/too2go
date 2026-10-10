import { t } from '@too2go/shared';
import { Linking, StyleSheet, View } from 'react-native';

import { BackButton } from '@/app/oferta/[id]';
import { Body, Button, Card, Muted, Screen, Subtitle, Title } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { env } from '@/lib/env';

export default function Ayuda() {
  const wa = env.supportWhatsapp.replace(/\D/g, '');
  return (
    <Screen>
      <BackButton />
      <Title>{t.ayuda.titulo}</Title>
      {t.ayuda.pasos.map((p) => (
        <Card key={p.titulo} style={styles.card}>
          <Subtitle>{p.titulo}</Subtitle>
          <Muted>{p.texto}</Muted>
        </Card>
      ))}
      <Title style={styles.faqTitle}>{t.ayuda.faqTitulo}</Title>
      {t.ayuda.faq.map((f) => (
        <View key={f.p} style={styles.faq}>
          <Subtitle>{f.p}</Subtitle>
          <Body>{f.r}</Body>
        </View>
      ))}
      {wa ? (
        <Button
          title={t.ayuda.contacto}
          variant="secondary"
          style={styles.contact}
          onPress={() => void Linking.openURL(`https://wa.me/${wa}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md },
  faqTitle: { marginTop: spacing.xl, fontSize: 22 },
  faq: { marginTop: spacing.md, gap: spacing.xs },
  contact: { marginTop: spacing.xl },
});
