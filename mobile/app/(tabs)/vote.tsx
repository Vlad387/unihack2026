// Votează: same flow as the site's vote deck (components/vote-deck.tsx).
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Body, Button, Card, Eyebrow, Screen, Title } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import { errorText, getStatementsToVote, submitVote } from '../../lib/api';
import type { Statement, VoteValue } from '../../lib/types';
import { FONTS } from '../../theme';

// A fresh answer needs a few seconds of AI processing before its statements exist, so retry while empty.
const RETRY_MS = 3000;

export default function Vote() {
  const { colors, haptic } = useAppContext();
  const router = useRouter();
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loads (and retries) only while this tab is on screen.
  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let stopped = false;
      const load = () =>
        getStatementsToVote()
          .then(list => {
            if (stopped) return;
            setLoadError(null);
            setStatements(list);
            setIndex(0);
            if (list.length === 0) timer = setTimeout(load, RETRY_MS);
          })
          .catch(err => {
            console.error('getStatementsToVote failed', err);
            if (stopped) return;
            setLoadError(errorText(err));
            timer = setTimeout(load, RETRY_MS);
          });
      load();
      return () => {
        stopped = true;
        clearTimeout(timer);
      };
    }, []),
  );

  async function vote(value: VoteValue) {
    if (!statements) return;
    setSending(true);
    setError(null);
    try {
      await submitVote(statements[index].id, value);
      haptic(value === 'pass' ? 'select' : 'success');
      setIndex(i => i + 1);
    } catch (err) {
      // stay on the same statement so the vote isn't silently lost
      console.error('submitVote failed', err);
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  }

  if (statements === null || statements.length === 0) {
    return (
      <Screen>
        <Eyebrow>Pasul 2 din 4 · votează</Eyebrow>
        <Title>Ce cred ceilalți?</Title>
        <Body subtle>
          {loadError
            ? `${loadError} Reîncercăm automat…`
            : statements === null
              ? 'Se încarcă afirmațiile…'
              : 'AI-ul pregătește afirmațiile din răspunsurile oamenilor. Apar aici în câteva secunde…'}
        </Body>
      </Screen>
    );
  }

  if (index >= statements.length) {
    return (
      <Screen>
        <Eyebrow>Pasul 2 din 4 · gata</Eyebrow>
        <Title>Ai votat tot! 🎉</Title>
        <Body>Mulțumim. Vezi acum taberele care se formează și propunerea de compromis.</Body>
        <Button title="Vezi rundele" onPress={() => router.navigate('/board')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow>Afirmația {index + 1} din {statements.length}</Eyebrow>
      <View style={[styles.progress, { backgroundColor: colors.line }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${(index / statements.length) * 100}%` }]} />
      </View>
      <Card style={styles.card}>
        <Text style={[styles.quote, { color: colors.text }]}>„{statements[index].text}”</Text>
      </Card>
      <Button title="De acord" color={colors.agree} onPress={() => vote('agree')} disabled={sending} />
      <Button title="Nu sunt de acord" color={colors.disagree} onPress={() => vote('disagree')} disabled={sending} />
      <Button title="Nu știu" variant="outline" onPress={() => vote('pass')} disabled={sending} />
      {error ? <Text style={{ color: colors.destructive, fontFamily: FONTS.medium }}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4 },
  card: { paddingVertical: 32, minHeight: 180, justifyContent: 'center' },
  quote: { fontFamily: FONTS.semibold, fontSize: 22, lineHeight: 29, letterSpacing: -0.4 },
});
