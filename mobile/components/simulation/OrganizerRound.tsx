// Organizer: start a compromise round (frontend/src/components/proposal-round.tsx). mediate + critic run 30–60 s
// on the server, so we poll the status. The password lives only in memory, never saved on the phone.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Body, Button, Card } from '../ui';
import { useAppContext } from '../../context/AppContext';
import { ApiError, getProposal, getRoundStatus, startProposalRound } from '../../lib/api';
import { FONTS } from '../../theme';

const POLL_MS = 2000;
type View_ = { state: 'idle' } | { state: 'running'; seconds: number } | { state: 'done'; round: number } | { state: 'failed'; error: string };

export default function OrganizerRound({ token, onTokenChange }: { token: string; onTokenChange: (value: string) => void }) {
  const { colors } = useAppContext();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View_>({ state: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const started = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function poll() {
    timer.current = setTimeout(async () => {
      try {
        const s = await getRoundStatus();
        if (s.state === 'running') {
          setView({ state: 'running', seconds: Math.round((Date.now() - started.current) / 1000) });
          poll();
        } else if (s.state === 'failed') {
          setView({ state: 'failed', error: s.error ?? 'Eroare necunoscută.' });
        } else {
          const p = await getProposal();
          setView({ state: 'done', round: p?.round ?? 0 });
        }
      } catch (err) {
        // network blip while polling: keep trying, the round keeps running on the server
        console.error('getRoundStatus failed', err);
        poll();
      }
    }, POLL_MS);
  }

  async function start() {
    clearTimeout(timer.current);
    started.current = Date.now();
    setView({ state: 'running', seconds: 0 });
    try {
      await startProposalRound(token.trim() || null);
      poll();
    } catch (err) {
      console.error('startProposalRound failed', err);
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) {
        // someone already started a round: follow that one instead of failing
        poll();
        return;
      }
      setView({
        state: 'failed',
        error: status === 401 ? 'Parola de organizator e greșită sau lipsește.' : 'Nu am putut porni runda. Verifică conexiunea și încearcă din nou.',
      });
    }
  }

  const failedText = (error: string) =>
    /429|quota/i.test(error)
      ? 'Runda a eșuat: limita gratuită Gemini s-a terminat pentru azi. Folosiți altă cheie sau un plan plătit, apoi încercați din nou.'
      : error.includes('at least one camp')
        ? 'Runda a eșuat: încă nu există tabere pe hartă. Lăsați câțiva participanți să răspundă și să voteze.'
        : error.startsWith('Parola') || error.startsWith('Nu am putut')
          ? error
          : 'Runda a eșuat. Puteți încerca din nou.';

  return (
    <Card>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={[styles.summary, { color: colors.text }]}>{open ? '▾' : '▸'} Organizator: pornește o rundă</Text>
      </Pressable>
      {open ? (
        <View style={{ gap: 10 }}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.background }]}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Parolă organizator"
            placeholderTextColor={colors.subtle}
            value={token}
            onChangeText={onTokenChange}
            accessibilityLabel="Parolă organizator"
          />
          <Body subtle style={styles.small}>
            Mediatorul AI scrie o propunere din taberele și punctele comune de pe hartă, plus criticile rundei anterioare. Durează 30–60
            de secunde, apoi apare live pe toate ecranele.
          </Body>
          <Button title={view.state === 'running' ? 'Se generează…' : 'Generează propunerea'} variant="gradient" onPress={start} loading={view.state === 'running'} />
          {view.state === 'running' ? <Body subtle style={styles.small}>AI-ul lucrează… {view.seconds} s</Body> : null}
          {view.state === 'done' ? <Text style={[styles.small, { color: colors.agree, fontFamily: FONTS.medium }]}>Propunerea pentru runda {view.round} e publicată pe toate ecranele.</Text> : null}
          {view.state === 'failed' ? <Text style={[styles.small, { color: colors.destructive, fontFamily: FONTS.medium }]}>{failedText(view.error)}</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: FONTS.semibold, fontSize: 15, paddingVertical: 2 },
  small: { fontSize: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: FONTS.regular },
});
