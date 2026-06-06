import { Redirect } from 'expo-router';
import { useStore } from '@/lib/store';

/** Entry gate: route to the workspace when linked, otherwise to the pairing screen. */
export default function Index() {
  const session = useStore((s) => s.session);
  return <Redirect href={session ? '/(app)/chats' : '/link'} />;
}
