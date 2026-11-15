// The round on the Simulare page (frontend/src/components/simulation/proposal-panel.tsx): the round title above the
// map, what each camp gains and gives up, the vote on the compromise, where it started, simulated voices, AI checks.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AiBadge, Body, Button, Card, Eyebrow } from '../ui';
import { useAppContext } from '../../context/AppContext';
import { campColors } from '../../lib/colors';
import type { Camp, Proposal, SupportRound, Verdict } from '../../lib/types';
import { FONTS, alpha } from '../../theme';

const SIMULATED = '#d97706'; // simulated voices: own color, never counted in percentages

// The round's headline: the AI compromise, else the council's proposal, else the question.
export function RoundTitle({ proposal, council, question }: { proposal: Proposal | null; council?: string | null; question: string }) {
  const { colors } = useAppContext();
  const [label, text] = proposal
    ? [`Runda ${proposal.round} · compromisul propus`, proposal.text]
    : council
      ? ['Runda 1 · propunerea primăriei', council]
      : ['Întrebarea consultării', question];
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      {proposal ? <AiBadge /> : null}
      <Text style={[proposal || council ? styles.titleSmall : styles.titleBig, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const CHECKS: { key: keyof Omit<Verdict, 'notes'>; label: string }[] = [
  { key: 'faithful', label: 'Fidelă argumentelor reale' },
  { key: 'balanced', label: 'Echilibrată între tabere' },
  { key: 'feasible', label: 'Legală și realizabilă' },
];

// The critic agent's checks. Icon + word, never color alone.
export function ChecksCard({ verdict }: { verdict?: Verdict | null }) {
  const { colors } = useAppContext();
  return (
    <Card>
      <Eyebrow>Verificările AI</Eyebrow>
      {verdict ? (
        <>
          {CHECKS.map(({ key, label }) => (
            <Text key={key} style={[styles.check, { color: colors.text }]}>
              <Text style={{ color: verdict[key] ? colors.agree : colors.disagree }}>{verdict[key] ? '✓' : '✗'}</Text> {label}:{' '}
              <Text style={{ fontFamily: FONTS.bold }}>{verdict[key] ? 'da' : 'nu'}</Text>
            </Text>
          ))}
          {verdict.notes ? <Body subtle style={styles.small}>{verdict.notes}</Body> : null}
        </>
      ) : (
        <Body subtle style={styles.small}>Apar după ce Mediatorul scrie compromisul.</Body>
      )}
    </Card>
  );
}

type DetailsProps = {
  proposal: Proposal | null;
  // demo: fictional text or null until step 7; live: undefined, because the API has no "original proposal" yet
  council?: string | null;
  camps: Camp[];
  support: SupportRound[];
  // demo counts locally, live posts to /proposal-votes; throws to show the message to the voter
  onVote: (support: boolean, critique: string | null) => Promise<void>;
};

export function RoundDetails({ proposal, council, camps, support, onVote }: DetailsProps) {
  const { colors } = useAppContext();
  const [critique, setCritique] = useState('');
  const [votedRound, setVotedRound] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const palette = campColors(camps);

  if (!proposal) {
    return (
      <Card style={{ alignItems: 'center' }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Aici apare compromisul</Text>
        <Body subtle style={[styles.small, { textAlign: 'center' }]}>După ce organizatorul pornește runda, vezi ce câștigă fiecare tabără și poți vota.</Body>
      </Card>
    );
  }

  const now = support.find(r => r.round === proposal.round);
  const pct = now?.total ? Math.round((now.agree / now.total) * 100) : 0;

  async function vote(yes: boolean) {
    setSending(true);
    setError(null);
    try {
      await onVote(yes, critique.trim() || null);
      setVotedRound(proposal?.round ?? null);
      setCritique('');
    } catch (err) {
      // keep the critique so the voter can retry
      console.error('proposal vote failed', err);
      setError(err instanceof Error ? err.message : 'Nu am putut trimite votul.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Eyebrow>Ce câștigă și ce cedează fiecare tabără</Eyebrow>
      {proposal.tradeoffs.map(t => (
        <Card key={t.camp_id} style={{ borderTopWidth: 4, borderTopColor: palette.get(t.camp_id) ?? colors.line }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{camps.find(c => c.id === t.camp_id)?.name ?? 'Tabără'}</Text>
          <Body style={styles.small}><Text style={{ color: colors.agree, fontFamily: FONTS.bold }}>+ </Text>{t.gains}</Body>
          <Body subtle style={styles.small}><Text style={{ color: colors.disagree, fontFamily: FONTS.bold }}>− </Text>{t.gives_up}</Body>
        </Card>
      ))}

      <Card>
        <Eyebrow>Votul pe compromis</Eyebrow>
        <View style={styles.pctRow}>
          <Text style={[styles.pct, { color: colors.text }]}>{pct}%</Text>
          <Body subtle style={styles.small}>
            susțin · {now?.total ?? 0} {now?.total === 1 ? 'vot' : 'voturi'} {council === undefined ? '(doar voturi reale)' : '(fictive)'}
          </Body>
        </View>
        <View style={[styles.bar, { backgroundColor: colors.line }]}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.agree }]} />
        </View>
        {votedRound === proposal.round ? (
          <Body style={styles.small}>Mulțumim! Criticile intră în runda următoare.</Body>
        ) : (
          <View style={{ gap: 10, marginTop: 6 }}>
            <View style={styles.voteRow}>
              <Button title="Susțin" color={colors.agree} onPress={() => vote(true)} disabled={sending} style={{ flex: 1 }} />
              <Button title="Nu susțin" color={colors.disagree} onPress={() => vote(false)} disabled={sending} style={{ flex: 1 }} />
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.background }]}
              multiline
              maxLength={1000}
              placeholder="Ce ai schimba? (opțional)"
              placeholderTextColor={colors.subtle}
              value={critique}
              onChangeText={setCritique}
              accessibilityLabel="Ce ai schimba?"
            />
            {error ? <Text style={{ color: colors.destructive, fontFamily: FONTS.medium }}>{error}</Text> : null}
          </View>
        )}
      </Card>

      <Card>
        <Eyebrow>De unde a pornit</Eyebrow>
        <Body subtle={council === undefined} style={styles.small}>
          {council === undefined ? 'Propunerea inițială a primăriei nu există încă în API.' : council}
        </Body>
        {proposal.proxies?.length ? (
          <View style={[styles.proxies, { borderColor: SIMULATED, backgroundColor: alpha(SIMULATED, 0.06) }]}>
            <Text style={[styles.simLabel, { color: SIMULATED }]}>Voci care lipsesc · simulat</Text>
            {proposal.proxies.map(p => (
              <View key={p.group} style={{ gap: 2 }}>
                <Text style={[styles.group, { color: SIMULATED }]}>{p.group}</Text>
                <Body subtle style={styles.small}>{p.text}</Body>
              </View>
            ))}
            <Body subtle style={styles.tiny}>Opinii simulate de AI. Nu sunt voturi și nu intră în procente.</Body>
          </View>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  titleBig: { fontFamily: FONTS.extrabold, fontSize: 26, lineHeight: 29, letterSpacing: -0.8 },
  titleSmall: { fontFamily: FONTS.semibold, fontSize: 17, lineHeight: 24 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 17 },
  check: { fontFamily: FONTS.regular, fontSize: 15, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
  tiny: { fontSize: 12, lineHeight: 17 },
  pctRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  pct: { fontFamily: FONTS.extrabold, fontSize: 40, letterSpacing: -1.5 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  voteRow: { flexDirection: 'row', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, minHeight: 64, textAlignVertical: 'top', fontFamily: FONTS.regular },
  proxies: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, padding: 12, gap: 8, marginTop: 6 },
  simLabel: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  group: { fontFamily: FONTS.semibold, fontSize: 14 },
});
