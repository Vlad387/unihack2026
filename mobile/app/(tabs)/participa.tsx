// Participă: same form as the site (components/answer-form.tsx + mic-button.tsx): voice or text, optional
// neighborhood and age, sent to POST /responses.
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Body, Button, Card, Eyebrow, Screen, Title } from '../../components/ui';
import { SymbolView } from '../../components/SymbolView';
import { useAppContext } from '../../context/AppContext';
import { QUESTION, errorText, submitResponse } from '../../lib/api';
import { FONTS, GRADIENT } from '../../theme';

// The backend refuses audio over 10 MB; 2 minutes of HIGH_QUALITY m4a stays well under it.
const MAX_SECONDS = 120;

export default function Participa() {
  const { colors, haptic } = useAppContext();
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [text, setText] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  // state updates are async, so a fast double tap could slip through: this guard blocks it instantly
  const inFlight = useRef(false);
  const seconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  async function startRecording() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microfon blocat', 'Permite accesul la microfon din Setările telefonului sau scrie răspunsul.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: MAX_SECONDS });
    setAudioUri(null);
    haptic('select');
  }

  async function stopRecording() {
    setRecordedSeconds(seconds);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    setAudioUri(recorder.uri);
    haptic('success');
  }

  async function send() {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus('sending');
    try {
      const ageNumber = Number(age);
      await submitResponse({
        text: text.trim() || null,
        audioUri,
        neighborhood: neighborhood.trim() || null,
        age: age && ageNumber >= 14 && ageNumber <= 110 ? ageNumber : null,
      });
      haptic('success');
      setStatus('sent');
    } catch (err) {
      // keep the form filled so the citizen can retry without losing the answer
      console.error('submitResponse failed', err);
      inFlight.current = false;
      setError(errorText(err));
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <Screen>
        <Eyebrow>Pasul 1 din 4 · gata</Eyebrow>
        <Title>Mulțumim! 🙌</Title>
        <Body>Răspunsul tău a fost trimis. Acum vezi ce cred ceilalți.</Body>
        <Button title="Votează afirmațiile celorlalți" onPress={() => router.navigate('/vote')} />
      </Screen>
    );
  }

  const recording = recorderState.isRecording;
  const canSend = (audioUri !== null || text.trim() !== '') && !recording && status !== 'sending';
  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.card }];

  return (
    <Screen>
      <Eyebrow>Pasul 1 din 4 · întrebarea</Eyebrow>
      <Title size={32}>{QUESTION}</Title>
      <Body subtle>Spune ce crezi, cu vocea sau în scris. Fără cont, în mai puțin de un minut.</Body>

      <View style={styles.micWrap}>
        <Pressable
          onPress={recording ? stopRecording : startRecording}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Oprește înregistrarea' : 'Înregistrează răspunsul'}
        >
          <LinearGradient colors={recording ? ['#e11d48', '#be123c'] : GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mic}>
            <SymbolView name={recording ? 'stop.fill' : 'mic.fill'} size={44} tintColor="#ffffff" />
          </LinearGradient>
        </Pressable>
        <Text style={[styles.micLabel, { color: colors.subtle }]}>
          {recording
            ? `Se înregistrează… ${seconds}s (atinge ca să oprești)`
            : audioUri
              ? `Înregistrare gata (${recordedSeconds}s). Atinge ca să o refaci.`
              : 'Atinge ca să vorbești'}
        </Text>
      </View>

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.line }]} />
        <Text style={{ color: colors.subtle, fontFamily: FONTS.regular }}>sau scrie</Text>
        <View style={[styles.line, { backgroundColor: colors.line }]} />
      </View>

      <TextInput
        style={[inputStyle, styles.textArea]}
        multiline
        maxLength={2000}
        placeholder="Ce crezi că ar trebui făcut?"
        placeholderTextColor={colors.subtle}
        value={text}
        onChangeText={setText}
        accessibilityLabel="Răspunsul tău"
      />

      <Card>
        <Text style={[styles.label, { color: colors.text }]}>Despre tine (opțional)</Text>
        <View style={styles.row}>
          <TextInput style={[inputStyle, styles.flex]} placeholder="Cartier" placeholderTextColor={colors.subtle} value={neighborhood} onChangeText={setNeighborhood} accessibilityLabel="Cartier" />
          <TextInput style={[inputStyle, styles.flex]} placeholder="Vârstă" placeholderTextColor={colors.subtle} keyboardType="number-pad" maxLength={3} value={age} onChangeText={setAge} accessibilityLabel="Vârstă" />
        </View>
      </Card>

      {status === 'error' ? <Text style={{ color: colors.destructive, fontFamily: FONTS.medium }}>{error}</Text> : null}
      <Button title={status === 'sending' ? 'Se trimite…' : 'Trimite răspunsul'} onPress={send} disabled={!canSend} loading={status === 'sending'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  micWrap: { alignItems: 'center', gap: 12, marginVertical: 8 },
  mic: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  micLabel: { fontFamily: FONTS.medium, fontSize: 14, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: FONTS.regular },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  label: { fontFamily: FONTS.semibold, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
