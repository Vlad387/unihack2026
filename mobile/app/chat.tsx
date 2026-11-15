// Bingus, the help chat (frontend/src/components/chat-widget.tsx + chat-actions.tsx) as a native sheet.
// Actions only open a page or a draft; nothing is submitted on the citizen's behalf.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from '../components/SymbolView';
import { useAppContext } from '../context/AppContext';
import { ApiError, sendChat, sendReport } from '../lib/api';
import { saveDraft } from '../lib/draft';
import type { ChatAction, ChatMessage, ReportDraft } from '../lib/types';
import { FONTS, GRADIENT, alpha } from '../theme';

type Entry = ChatMessage & { action?: ChatAction; report?: ReportDraft | null };

const SUGGESTIONS = ['Cum particip?', 'Unde văd harta?', 'Vreau să raportez o problemă'];
const GREETING = 'Salut! Sunt Bingus, mascota CityMind, și sunt aici să te ajut: să răspunzi la consultare, să votezi, să găsești harta sau să raportezi o problemă.';
const PAGES = { vote: { href: '/vote', label: 'Mergi la vot' }, map: { href: '/board', label: 'Vezi harta' }, proposal: { href: '/board', label: 'Vezi propunerea' } } as const;
const KIND: Record<ReportDraft['kind'], string> = { abuse: 'Limbaj abuziv', personal_data: 'Date personale', bug: 'Problemă tehnică', other: 'Altceva' };

// shortcut: the conversation lives in memory for the app session (like the site's tab session), not on disk.
let saved: Entry[] = [];

export default function Chat() {
  const { colors, haptic } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // the tab the chat was opened from, so the server can tailor its help (same page names as the site)
  const { from } = useLocalSearchParams<{ from?: string }>();
  const log = useRef<ScrollViewInstance>(null);
  const [entries, setEntries] = useState<Entry[]>(saved);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { saved = entries; }, [entries]);

  async function ask(text: string) {
    const q = text.trim().slice(0, 1000);
    if (!q || waiting) return;
    const next: Entry[] = [...entries, { role: 'user', text: q }];
    setEntries(next);
    setInput('');
    setError(null);
    setWaiting(true);
    haptic('select');
    try {
      const reply = await sendChat(next.map(({ role, text: t }) => ({ role, text: t })), from ?? '/');
      setEntries([...next, { role: 'assistant', text: reply.text, action: reply.action, report: reply.report }]);
    } catch (err) {
      console.error('sendChat failed', err);
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Ai trimis multe mesaje într-un minut. Așteaptă puțin și încearcă din nou.'
          : err instanceof TypeError // the request never reached the server
            ? 'Asistentul nu răspunde acum. Verifică internetul și încearcă din nou.'
            : 'Asistentul nu e disponibil acum. Încearcă din nou puțin mai târziu.',
      );
    } finally {
      setWaiting(false);
    }
  }

  const go = (href: string) => {
    router.back();
    router.navigate(href as never);
  };
  const lastUserText = [...entries].reverse().find(e => e.role === 'user')?.text ?? '';

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 12 : 16 }]}>
        <View style={styles.avatar}>
          <Image source={require('../assets/bingus.png')} style={styles.avatarImage} accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Bingus <Text style={styles.headerSub}>· Asistent AI</Text>
          </Text>
          <Text style={styles.headerText}>Te ajută să participi. Nu votează în locul tău.</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Închide asistentul" style={styles.close}>
          <SymbolView name="xmark" size={18} weight="semibold" tintColor="#ffffff" />
        </Pressable>
      </LinearGradient>

      <ScrollView
        ref={log}
        style={{ flex: 1 }}
        contentContainerStyle={styles.log}
        onContentSizeChange={() => log.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        accessibilityLabel="Conversația cu asistentul"
      >
        <Bubble role="assistant" text={GREETING} />
        {entries.length === 0 ? (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <Pressable key={s} onPress={() => ask(s)} accessibilityRole="button" style={[styles.chip, { borderColor: colors.line, backgroundColor: colors.card }]}>
                <Text style={[styles.chipText, { color: colors.text }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {entries.map((e, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Bubble role={e.role} text={e.text} />
            {e.action?.type === 'answer' ? (
              <ActionButton
                label="Deschide formularul cu ciorna"
                onPress={() => { saveDraft(e.action?.prefill || lastUserText); go('/participa'); }}
              />
            ) : e.action && e.action.type in PAGES ? (
              <ActionButton label={PAGES[e.action.type as keyof typeof PAGES].label} onPress={() => go(PAGES[e.action!.type as keyof typeof PAGES].href)} />
            ) : null}
            {e.action?.type === 'report' && e.report ? <ReportCard draft={e.report} /> : null}
          </View>
        ))}
        {waiting ? (
          <View style={[styles.typing, { backgroundColor: alpha(colors.isDark ? '#ffffff' : '#0f0f16', 0.06) }]} accessibilityLabel="Asistentul scrie">
            <ActivityIndicator size="small" color={colors.subtle} />
          </View>
        ) : null}
        {error ? <Text style={[styles.error, { color: colors.destructive, backgroundColor: alpha(colors.destructive, 0.1) }]}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.composer, { borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.card }]}
          value={input}
          onChangeText={setInput}
          placeholder="Scrie o întrebare…"
          placeholderTextColor={colors.subtle}
          multiline
          maxLength={1000}
          autoFocus={entries.length > 0}
          accessibilityLabel="Mesajul tău"
        />
        <Pressable onPress={() => ask(input)} disabled={waiting || !input.trim()} accessibilityRole="button" accessibilityLabel="Trimite mesajul" style={{ opacity: waiting || !input.trim() ? 0.4 : 1 }}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.send}>
            <SymbolView name="arrow.up" size={20} weight="bold" tintColor="#ffffff" />
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ role, text }: ChatMessage) {
  const { colors } = useAppContext();
  const mine = role === 'user';
  return (
    <View style={[styles.bubbleWrap, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.who, { color: colors.faint }]}>{mine ? 'Tu' : 'Bingus · Asistent AI'}</Text>
      {mine ? (
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleMine]}>
          <Text style={[styles.bubbleText, { color: '#ffffff' }]}>{text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleTheirs, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <Text style={[styles.bubbleText, { color: colors.text }]}>{text}</Text>
        </View>
      )}
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppContext();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.action, { borderColor: colors.accent, backgroundColor: colors.card }]}>
      <Text style={[styles.actionText, { color: colors.accent }]}>{label}  →</Text>
    </Pressable>
  );
}

// A report the assistant drafted: the citizen reads (and can edit) it, and only "Trimite raportul" sends it.
function ReportCard({ draft }: { draft: ReportDraft }) {
  const { colors, haptic } = useAppContext();
  const [text, setText] = useState(draft.text);
  const [state, setState] = useState<'draft' | 'sending' | 'sent' | 'error'>('draft');

  async function send() {
    setState('sending');
    try {
      await sendReport({ ...draft, text: text.trim() });
      haptic('success');
      setState('sent');
    } catch (err) {
      console.error('sendReport failed', err);
      setState('error');
    }
  }

  return (
    <View style={[styles.report, { borderColor: colors.subtle, backgroundColor: colors.card }]}>
      <Text style={[styles.reportLabel, { color: colors.subtle }]}>Ciornă de raport · {KIND[draft.kind]}</Text>
      {state === 'sent' ? (
        <Text style={[styles.bubbleText, { color: colors.agree, fontFamily: FONTS.semibold }]}>✓ Trimis. Mulțumim, organizatorul îl vede.</Text>
      ) : (
        <>
          <TextInput
            style={[styles.input, styles.reportInput, { color: colors.text, borderColor: colors.line, backgroundColor: colors.background }]}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={state !== 'sending'}
            accessibilityLabel="Textul raportului"
          />
          {state === 'error' ? <Text style={{ color: colors.destructive, fontFamily: FONTS.medium }}>Nu am putut trimite raportul. Încearcă din nou.</Text> : null}
          <Pressable onPress={send} disabled={state === 'sending' || !text.trim()} accessibilityRole="button" style={[styles.reportSend, { backgroundColor: colors.primary, opacity: state === 'sending' || !text.trim() ? 0.5 : 1 }]}>
            {state === 'sending' ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.actionText, { color: colors.onPrimary }]}>Trimite raportul</Text>}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 36, height: 31 },
  headerTitle: { color: '#ffffff', fontFamily: FONTS.bold, fontSize: 17 },
  headerSub: { fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.85)' },
  headerText: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.regular, fontSize: 13, marginTop: 1 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  log: { padding: 16, gap: 14 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: FONTS.medium, fontSize: 14 },
  bubbleWrap: { maxWidth: '85%', gap: 4 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  who: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 15.5, lineHeight: 22 },
  typing: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  error: { borderRadius: 10, padding: 10, fontFamily: FONTS.medium, fontSize: 14, overflow: 'hidden' },
  action: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  actionText: { fontFamily: FONTS.semibold, fontSize: 14.5 },
  report: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 12, gap: 10 },
  reportLabel: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase' },
  reportInput: { minHeight: 80 },
  reportSend: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 140, alignItems: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 16, maxHeight: 120, fontFamily: FONTS.regular },
  send: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
