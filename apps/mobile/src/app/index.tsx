import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { hasSeenOnboarding } from '@/lib/storage';

/** Punto de entrada: decide entre onboarding, login o la app. */
export default function Index() {
  const { session, profile } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    void hasSeenOnboarding().then(setSeen);
  }, []);

  if (session) {
    if (profile && !profile.full_name) return <Redirect href="/nombre" />;
    return <Redirect href="/(tabs)" />;
  }
  if (seen === null) return <Loading />;
  return <Redirect href={seen ? '/login' : '/onboarding'} />;
}
