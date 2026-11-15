// Rundele: the site's live board (components/live-board.tsx) + "where you are" + voting on the proposal, in one column.
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import OpinionMap from '../../components/OpinionMap';
import { AiBadge, Body, Button, Card, Eyebrow, Screen, Title } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import { ApiError, QUESTION, errorText, getBridges, getClusters, getParticipantId, getProposal, getSupport, submitProposalVote } from '../../lib/api';
import { campColors } from '../../lib/colors';
import type { ClusterResult, Proposal, Statement, SupportRound } from '../../lib/types';
import { FONTS, alpha } from '../../theme';

// shortcut: polls every 10 s while the tab is open instead of the WebSocket; switch to /ws if it feels slow.
const POLL_MS = 10000;
const SIMULATED = '#d97706'; // simulated voices get their own color, never counted in percentages

type Data = { clusters: ClusterResult; bridges: Statement[]; proposal: Proposal | null; support: SupportRound[]; me: string };

export default function Board() {
  const { colors, haptic } = useAppContext();
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [critique, setCritique] = useState('');
  const [voted, setVoted] = useState<string | null>(null); // proposal id this phone voted on
  const [voteError, setVoteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [clusters, bridges, proposal, support, me] = await Promise.all([getClusters(), getBridges(), getProposal(), getSupport(), getParticipantId()]);
      setData({ clusters, bridges, proposal, support, me });
      setLoadError(null);
    } catch (err) {
      console.error('board load failed', err);
      setLoadError(errorText(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  async function voteProposal(support: boolean) {
    if (!data?.proposal) return;
    setSending(true);
    setVoteError(null);
    try {
      await submitProposalVote(data.proposal.id, support, critique.trim() || null);
      haptic('success');
      setVoted(data.proposal.id);
      load();
    } catch (err) {
      console.error('submitProposalVote failed', err);
      setVoteError(err instanceof ApiError && err.status === 409 ? 'Runda s-a închis: a apărut o propunere nouă. Trage în jos ca să o vezi.' : errorText(err));
    } finally {
      setSending(false);
    }
  }

  if (!data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <Eyebrow>Live</Eyebrow>
        <Title>Rundele</Title>
        <Body subtle>{loadError ? `${loadError} Reîncercăm automat…` : 'Se încarcă harta opiniilor…'}</Body>
      </Screen>
    );
  }

  const { clusters, bridges, proposal, support, me } = data;
  const palette = campColors(clusters.camps);
  const myPoint = clusters.points.find(p => p.participant_id === me) ?? null;
  const myCamp = clusters.camps.find(c => c.id === myPoint?.camp_id) ?? null;
  const current = support.at(-1);
  const percent = current && current.total > 0 ? Math.round((current.agree / current.total) * 100) : null;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Eyebrow>Live · {clusters.points.length} participanți</Eyebrow>
      <Title size={30}>{QUESTION}</Title>

      <Card>
        <Eyebrow>Sprijin pe runde</Eyebrow>
        {current ? (
          <>
            <Text style={[styles.bigNumber, { color: colors.accent }]}>{percent ?? 0}%</Text>
            <Body subtle>Runda {current.round}: {current.agree} din {current.total} voturi reale „de acord”.</Body>
          </>
        ) : (
          <Body subtle>Încă nu a început nicio rundă de vot.</Body>
        )}
      </Card>

      {clusters.points.length > 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <OpinionMap clusters={clusters} me={me} />
          <Body subtle style={styles.center}>
            {myPoint ? `Tu ești punctul mare${myCamp ? `, în tabăra „${myCamp.name}”` : ''}.` : 'Apari pe hartă după ce răspunzi și votezi câteva afirmații.'}
          </Body>
        </Card>
      ) : null}

      {clusters.camps.length > 0 ? <Eyebrow>Taberele</Eyebrow> : null}
      {clusters.camps.map(camp => (
        <Card key={camp.id}>
          <View style={styles.campHeader}>
            <View style={[styles.dot, { backgroundColor: palette.get(camp.id) }]} />
            <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]}>{camp.name}</Text>
            <Text style={[styles.count, { color: colors.subtle }]}>{camp.size} oameni</Text>
          </View>
          <Body subtle>{camp.description}</Body>
        </Card>
      ))}

      {bridges.length > 0 ? <Eyebrow>Puncte comune</Eyebrow> : null}
      {bridges.map(b => (
        <Card key={b.id}>
          <Body>„{b.text}”</Body>
        </Card>
      ))}

      {proposal ? (
        <>
          <Eyebrow>Propunerea · runda {proposal.round}</Eyebrow>
          <Card>
            <AiBadge />
            <Body style={styles.proposal}>{proposal.text}</Body>
            {proposal.tradeoffs.map(t => (
              <View key={t.camp_id} style={[styles.tradeoff, { borderLeftColor: palette.get(t.camp_id) ?? colors.line }]}>
                <Text style={[styles.tradeoffTitle, { color: colors.text }]}>{clusters.camps.find(c => c.id === t.camp_id)?.name ?? 'Tabără'}</Text>
                <Body subtle>Câștigă: {t.gains}</Body>
                <Body subtle>Cedează: {t.gives_up}</Body>
              </View>
            ))}
            {proposal.verdict ? (
              <Body subtle style={styles.small}>
                Verificare AI: {proposal.verdict.faithful ? '✓' : '✗'} fidelă · {proposal.verdict.balanced ? '✓' : '✗'} echilibrată ·{' '}
                {proposal.verdict.feasible ? '✓' : '✗'} posibilă
              </Body>
            ) : null}
          </Card>

          {proposal.proxies?.length ? (
            <View style={[styles.proxies, { borderColor: SIMULATED }]}>
              <Text style={[styles.eyebrowSim, { color: SIMULATED }]}>Voci care lipsesc · simulat</Text>
              {proposal.proxies.map(p => (
                <View key={p.group} style={{ gap: 2 }}>
                  <Text style={[styles.tradeoffTitle, { color: SIMULATED }]}>{p.group}</Text>
                  <Body subtle>{p.text}</Body>
                </View>
              ))}
              <Body subtle style={styles.small}>Opinii simulate de AI. Nu sunt voturi și nu intră în procente.</Body>
            </View>
          ) : null}

          {voted === proposal.id ? (
            <Card style={{ backgroundColor: alpha(colors.agree, 0.12) }}>
              <Body>Mulțumim, votul tău a fost înregistrat. Poți vota din nou ca să-l schimbi.</Body>
            </Card>
          ) : null}
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.card }]}
            multiline
            maxLength={1000}
            placeholder="Ce ai schimba? (opțional)"
            placeholderTextColor={colors.subtle}
            value={critique}
            onChangeText={setCritique}
            accessibilityLabel="Critica ta"
          />
          <Button title="Susțin propunerea" color={colors.agree} onPress={() => voteProposal(true)} disabled={sending} />
          <Button title="Nu o susțin" color={colors.disagree} onPress={() => voteProposal(false)} disabled={sending} />
          {voteError ? <Text style={{ color: colors.destructive, fontFamily: FONTS.medium }}>{voteError}</Text> : null}
        </>
      ) : (
        <Card>
          <Body subtle>Propunerea de compromis apare aici când organizatorul pornește prima rundă.</Body>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigNumber: { fontFamily: FONTS.extrabold, fontSize: 56, letterSpacing: -2 },
  center: { textAlign: 'center', fontSize: 14 },
  campHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18, letterSpacing: -0.3 },
  count: { fontFamily: FONTS.mono, fontSize: 12 },
  proposal: { fontFamily: FONTS.medium, fontSize: 17, lineHeight: 25 },
  tradeoff: { borderLeftWidth: 3, paddingLeft: 12, gap: 2, marginTop: 6 },
  tradeoffTitle: { fontFamily: FONTS.semibold, fontSize: 15 },
  small: { fontSize: 13, lineHeight: 18 },
  proxies: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 18, gap: 10 },
  eyebrowSim: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 80, textAlignVertical: 'top', fontFamily: FONTS.regular },
});
