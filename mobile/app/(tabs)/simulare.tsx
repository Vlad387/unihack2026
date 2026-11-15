// Simulare: the site's pipeline dashboard (frontend/src/components/simulation/dashboard.tsx), in one phone column.
// DEMO runs on fictional data on the phone only (nothing reaches the server); LIVE reads the real backend.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import OpinionMap from '../../components/OpinionMap';
import SegmentedControl from '../../components/SegmentedControl';
import Pipeline from '../../components/simulation/Pipeline';
import OrganizerRound from '../../components/simulation/OrganizerRound';
import { ChecksCard, RoundDetails, RoundTitle } from '../../components/simulation/RoundPanel';
import { Body, Button, Card, Eyebrow, Screen, Title } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import { ApiError, QUESTION, errorText, getBridges, getClusters, getProposal, getResponseStats, getRoundStatus, getSupport, submitProposalVote } from '../../lib/api';
import { campColors } from '../../lib/colors';
import { DONE_STEP, demoFrame, demoStatuses, liveStatuses } from '../../lib/simulation';
import type { StageStatus } from '../../lib/simulation';
import type { ClusterResult, Proposal, ResponseStats, RoundStatus, Statement, SupportRound } from '../../lib/types';
import { FONTS, alpha } from '../../theme';

type Mode = 'demo' | 'live';

export default function Simulare() {
  const { colors, haptic } = useAppContext();
  const [mode, setMode] = useState<Mode>('demo');
  return (
    <Screen>
      <Eyebrow>Simulare</Eyebrow>
      <Title size={32}>De la păreri împrăștiate la un compromis votat</Title>
      <Body subtle>Toți cei 9 pași ai unei consultări. DEMO rulează pe date fictive în telefon; LIVE arată datele reale de pe server.</Body>
      <SegmentedControl
        options={[{ value: 'demo' as Mode, label: 'DEMO' }, { value: 'live' as Mode, label: 'LIVE' }]}
        value={mode}
        onChange={value => { haptic('select'); setMode(value); }}
        trackColor={alpha(colors.isDark ? '#ffffff' : '#0f0f16', 0.07)}
        activeColor={colors.primary}
        textColor={colors.subtle}
        activeTextColor={colors.onPrimary}
      />
      <Body subtle style={styles.small}>
        {mode === 'demo' ? 'Date fictive, doar în telefon. Nimic nu ajunge la server.' : 'Date reale de la server, actualizate la câteva secunde.'}
      </Body>
      {mode === 'demo' ? <DemoView /> : <LiveView />}
    </Screen>
  );
}

const FINAL_VOTES = 36;
type Sim = { step: number; votes: { agree: number; total: number } };

// Final voting (step 9) fills up vote by vote (~2 of 3 agree) before the demo finishes; `skip` jumps to the next stage.
function next(s: Sim, skip: boolean): Sim {
  if (s.step === 9 && s.votes.total < FINAL_VOTES) {
    const add = skip ? FINAL_VOTES - s.votes.total : 1;
    const total = s.votes.total + add;
    const votes = { total, agree: s.votes.agree + (skip ? Math.round((add * 2) / 3) : total % 3 === 0 ? 0 : 1) };
    return { step: skip ? DONE_STEP : s.step, votes };
  }
  return { ...s, step: Math.min(s.step + 1, DONE_STEP) };
}

function DemoView() {
  const [sim, setSim] = useState<Sim>({ step: 0, votes: { agree: 0, total: 0 } });
  const [running, setRunning] = useState(false);
  const done = sim.step === DONE_STEP;
  const playing = running && !done; // the demo stops by itself at the end

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSim(s => next(s, false)), sim.step === 9 ? 350 : 3200);
    return () => clearInterval(id);
  }, [playing, sim.step]);

  // leaving the tab pauses the demo
  useFocusEffect(useCallback(() => () => setRunning(false), []));

  const start = () => {
    if (done) setSim({ step: 1, votes: { agree: 0, total: 0 } });
    else if (sim.step === 0) setSim(s => ({ ...s, step: 1 }));
    setRunning(true);
  };
  const frame = demoFrame(sim.step, sim.votes);

  return (
    <>
      <View style={styles.controls}>
        <Button title="▶ Pornește" onPress={start} disabled={playing || (sim.step > 0 && !done)} style={styles.control} />
        {playing ? (
          <Button title="❚❚ Pauză" variant="outline" onPress={() => setRunning(false)} style={styles.control} />
        ) : (
          <Button title="▶ Continuă" variant="outline" onPress={() => setRunning(true)} disabled={sim.step === 0 || done} style={styles.control} />
        )}
      </View>
      <View style={styles.controls}>
        <Button title="Pas înainte" variant="outline" onPress={() => setSim(s => next(s, true))} disabled={playing || done} style={styles.control} />
        <Button
          title="Resetează"
          variant="outline"
          onPress={() => { setRunning(false); setSim({ step: 0, votes: { agree: 0, total: 0 } }); }}
          disabled={sim.step === 0}
          style={styles.control}
        />
      </View>
      <Layout
        note={frame.note}
        clusters={frame.clusters}
        bridges={frame.bridges}
        statuses={demoStatuses(sim.step)}
        proposal={frame.proposal}
        council={frame.council}
        support={frame.support}
        // demo vote: counted locally only, never sent to the API
        onVote={async yes => setSim(s => ({ ...s, votes: { agree: s.votes.agree + (yes ? 1 : 0), total: s.votes.total + 1 } }))}
      />
    </>
  );
}

const POLL_MS = 3000;
type Live = { clusters: ClusterResult; bridges: Statement[]; proposal: Proposal | null; support: SupportRound[] };

function LiveView() {
  const [live, setLive] = useState<Live | null>(null);
  const [round, setRound] = useState<RoundStatus | null>(null);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  // read by the poll, so typing the password doesn't restart polling on every key
  const tokenRef = useRef('');
  tokenRef.current = token.trim();

  // shortcut: polls every 3 s while the tab is open instead of the WebSocket the site uses.
  useFocusEffect(
    useCallback(() => {
      const poll = () => {
        Promise.all([getClusters(), getBridges(), getProposal(), getSupport()])
          .then(([clusters, bridges, proposal, support]) => {
            setLive({ clusters, bridges, proposal, support });
            setLoadError(null);
          })
          .catch(err => {
            console.error('simulare live load failed', err);
            setLoadError(errorText(err));
          });
        getRoundStatus().then(setRound, err => console.error('getRoundStatus failed', err));
        // the answer queue needs the organizer password
        if (tokenRef.current)
          getResponseStats(tokenRef.current).then(setStats, err => {
            console.error('getResponseStats failed', err);
            setStats(null);
          });
      };
      poll();
      const id = setInterval(poll, POLL_MS);
      return () => clearInterval(id);
    }, []),
  );

  if (!live) return <Body subtle>{loadError ? `${loadError} Reîncercăm automat…` : 'Se încarcă datele de pe server…'}</Body>;

  async function vote(yes: boolean, critique: string | null) {
    if (!live?.proposal) return;
    try {
      await submitProposalVote(live.proposal.id, yes, critique);
    } catch (err) {
      throw new Error(
        err instanceof ApiError && err.status === 409 ? 'Runda aceasta s-a încheiat. Propunerea nouă apare imediat aici.' : 'Nu am putut trimite votul. Încearcă din nou.',
      );
    }
  }

  return (
    <Layout
      note={round?.state === 'running' ? 'Mediatorul și Criticul lucrează (30–60 s)…' : 'Date reale de pe server, actualizate live.'}
      clusters={live.clusters}
      bridges={live.bridges}
      statuses={liveStatuses({ clusters: live.clusters, bridges: live.bridges, proposal: live.proposal, round, stats })}
      proposal={live.proposal}
      support={live.support}
      onVote={vote}
      extra={<OrganizerRound token={token} onTokenChange={setToken} />}
    />
  );
}

type LayoutProps = {
  note: string;
  clusters: ClusterResult;
  bridges: Statement[];
  statuses: StageStatus[];
  proposal: Proposal | null;
  council?: string | null;
  support: SupportRound[];
  onVote: (support: boolean, critique: string | null) => Promise<void>;
  extra?: ReactNode;
};

// Phone order: where we are in the process, the round on top of the map, the round details, the AI checks.
function Layout({ note, clusters, bridges, statuses, proposal, council, support, onVote, extra }: LayoutProps) {
  const { colors } = useAppContext();
  const palette = campColors(clusters.camps);
  return (
    <>
      <Pipeline statuses={statuses} note={note} />
      <Card>
        <RoundTitle proposal={proposal} council={council} question={QUESTION} />
        <OpinionMap clusters={clusters} />
        <View style={styles.chips}>
          <Text style={[styles.chip, { color: colors.text, backgroundColor: colors.line }]}>
            <Text style={{ fontFamily: FONTS.bold }}>{clusters.points.length}</Text> participanți
          </Text>
          {bridges.length ? (
            <Text style={[styles.chip, { color: colors.text, backgroundColor: colors.line }]}>
              <Text style={{ fontFamily: FONTS.bold }}>{bridges.length}</Text> puncte comune
            </Text>
          ) : null}
          {clusters.camps.map(c => (
            <View key={c.id} style={[styles.chipRow, { backgroundColor: colors.line }]}>
              <View style={[styles.dot, { backgroundColor: palette.get(c.id) }]} />
              <Text style={[styles.chipText, { color: colors.text }]}>
                {c.name} · <Text style={{ fontFamily: FONTS.bold }}>{c.size}</Text>
              </Text>
            </View>
          ))}
        </View>
      </Card>
      <RoundDetails proposal={proposal} council={council} camps={clusters.camps} support={support} onVote={onVote} />
      <ChecksCard verdict={proposal?.verdict} />
      {extra}
    </>
  );
}

const styles = StyleSheet.create({
  small: { fontSize: 14, lineHeight: 20 },
  controls: { flexDirection: 'row', gap: 10 },
  control: { flex: 1, height: 44, paddingHorizontal: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { fontFamily: FONTS.regular, fontSize: 13, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: FONTS.regular, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
