// The 9 pipeline stages as a vertical timeline (frontend/src/components/simulation/pipeline.tsx). The current stage
// is highlighted and carries the explanation; status is always icon + word, never color alone.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow } from '../ui';
import { SymbolView } from '../SymbolView';
import { useAppContext } from '../../context/AppContext';
import { STAGES } from '../../lib/simulation';
import type { StageStatus } from '../../lib/simulation';
import { FONTS, alpha } from '../../theme';

const LABEL: Record<StageStatus, string> = { waiting: 'În așteptare', processing: 'În lucru', done: 'Gata' };

export default function Pipeline({ statuses, note }: { statuses: StageStatus[]; note: string }) {
  const { colors } = useAppContext();
  const done = statuses.filter(s => s === 'done').length;
  return (
    <Card>
      <View style={styles.header}>
        <Eyebrow>Procesul</Eyebrow>
        <Text style={[styles.count, { color: colors.subtle }]}>{done} / {STAGES.length} pași</Text>
      </View>
      {STAGES.map((stage, i) => {
        const st = statuses[i];
        const last = i === STAGES.length - 1;
        return (
          <View key={stage.title} style={styles.row} accessibilityLabel={`${stage.title}: ${LABEL[st]}`}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: st === 'done' ? colors.agree : st === 'processing' ? colors.accent : alpha(colors.isDark ? '#ffffff' : '#0f0f16', 0.1) },
                ]}
              >
                {st === 'done' ? (
                  <SymbolView name="checkmark" size={12} weight="bold" tintColor="#ffffff" />
                ) : st === 'processing' ? (
                  <ActivityIndicator size="small" color="#ffffff" style={{ transform: [{ scale: 0.6 }] }} />
                ) : (
                  <Text style={[styles.number, { color: colors.subtle }]}>{i + 1}</Text>
                )}
              </View>
              {!last ? <View style={[styles.line, { backgroundColor: st === 'done' ? alpha(colors.agree, 0.5) : colors.line }]} /> : null}
            </View>
            <View style={[styles.body, st === 'waiting' && { opacity: 0.55 }]}>
              <Text style={[styles.title, { color: colors.text, fontFamily: st === 'processing' ? FONTS.semibold : FONTS.medium }]}>{stage.title}</Text>
              {st === 'processing' ? (
                <View style={[styles.note, { backgroundColor: alpha(colors.accent, 0.1) }]}>
                  <Text style={[styles.noteText, { color: colors.text }]}>{note}</Text>
                  <Text style={[styles.api, { color: colors.subtle }]}>{stage.api}</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      {statuses.every(st => st === 'done') ? (
        <View style={[styles.note, { backgroundColor: alpha(colors.agree, 0.12) }]}>
          <Text style={[styles.noteText, { color: colors.text, fontFamily: FONTS.medium }]}>{note}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  count: { fontFamily: FONTS.mono, fontSize: 12 },
  row: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center' },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  number: { fontFamily: FONTS.bold, fontSize: 11 },
  line: { width: 2, flex: 1, minHeight: 10 },
  body: { flex: 1, paddingBottom: 14 },
  title: { fontSize: 15, lineHeight: 24 },
  note: { borderRadius: 10, padding: 10, marginTop: 4, gap: 4 },
  noteText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20 },
  api: { fontFamily: FONTS.mono, fontSize: 11 },
});
