// Acasă: the site's landing page (components/site/hero, features, learn, steps, closing) in one phone column,
// in the site's order: wordmark hero on the violet band, built-with strip, feature cards, statement, steps, CTA.
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import type { ReactNode } from 'react';
import { SymbolView } from '../../components/SymbolView';
import Wordmark from '../../components/Wordmark';
import { Body, Button, Card, Eyebrow, Screen, titleStyle } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import { FONTS, GRADIENT } from '../../theme';

const PAD = 20;

// The site's feature-card shape: one violet gradient drawing at the bottom of the card.
function Shape({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Svg viewBox="0 0 200 110" width="100%" height={112} style={{ marginTop: 'auto' }}>
      <Defs>
        <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#c27dff" />
          <Stop offset="1" stopColor="#5700c7" />
        </SvgGradient>
      </Defs>
      <G fill={`url(#${id})`}>{children}</G>
    </Svg>
  );
}

const FEATURES = [
  {
    title: 'Puncte comune, nu majorități',
    text: 'Căutăm ce acceptă fiecare tabără, oricât de mică, nu doar ce vrea cea mai mare.',
    shape: (
      <Shape id="f-common">
        <Circle cx="78" cy="62" r="40" opacity={0.55} />
        <Circle cx="122" cy="62" r="40" opacity={0.85} />
      </Shape>
    ),
  },
  {
    title: 'AI-ul e mereu etichetat',
    text: 'Tot ce scrie AI-ul e marcat „Generat de AI”. Deciziile rămân ale oamenilor.',
    shape: (
      <Shape id="f-label">
        <Path d="M40 30 h90 l34 32 l-34 32 h-90 a10 10 0 0 1 -10 -10 v-44 a10 10 0 0 1 10 -10 z" />
        <Circle cx="130" cy="62" r="8" fill="#fcfdff" />
      </Shape>
    ),
  },
  {
    title: 'Doar voturi reale',
    text: 'Opiniile simulate apar separat, în altă culoare, și nu intră niciodată în procente.',
    shape: (
      <Shape id="f-real">
        <Rect x="42" y="56" width="26" height="46" rx="6" />
        <Rect x="80" y="30" width="26" height="72" rx="6" />
        <Rect x="118" y="44" width="26" height="58" rx="6" />
        <Rect x="156" y="70" width="26" height="32" rx="6" opacity={0.25} />
      </Shape>
    ),
  },
  {
    title: 'Fără date personale',
    text: 'Nu cerem nume, telefon sau email. Mesajele cu date personale sunt filtrate.',
    shape: (
      <Shape id="f-private">
        <Rect x="56" y="48" width="88" height="56" rx="12" />
        <Path d="M76 48 v-12 a24 24 0 0 1 48 0 v12" fill="none" stroke="url(#f-private)" strokeWidth={10} />
      </Shape>
    ),
  },
];

const STEPS = [
  { title: 'Spune-ți părerea', text: 'Răspunzi cu vocea sau în scris. Fără cont, în mai puțin de un minut.' },
  { title: 'Votează ideile celorlalți', text: 'De acord, nu sunt de acord sau nu știu. Fiecare vot contează la fel.' },
  { title: 'Vezi unde te afli', text: 'Harta opiniilor arată taberele care se formează și locul tău printre ele.' },
  { title: 'Votează compromisul', text: 'AI-ul propune o soluție pornind de la punctele comune. Dacă nu trece pragul, o rescrie.' },
];

const BUILT_WITH = ['Gemini', 'Next.js', 'FastAPI', 'PostgreSQL', 'pgvector', 'UMAP', 'HDBSCAN'];

export default function Home() {
  const { colors } = useAppContext();
  const router = useRouter();
  const { width } = useWindowDimensions();
  // the site's hero headline (clamp up to 5rem), as big as a phone allows: ~50 pt on a 390 pt wide iPhone
  const headline = Math.round(Math.min(64, width * 0.128));
  const section = Math.round(Math.min(46, width * 0.095));

  return (
    <Screen hero>
      <View style={styles.topBar}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Setări" style={styles.gear}>
          <SymbolView name="gearshape.fill" size={20} tintColor="#ffffff" />
        </Pressable>
      </View>

      <Wordmark width={width - PAD * 2} color={colors.wordmark} />

      <View style={styles.hero}>
        <Text style={[titleStyle(headline), styles.headline, { color: colors.text, lineHeight: Math.round(headline * 0.98), letterSpacing: -headline * 0.04 }]} accessibilityRole="header">
          Orașul tău. Vocea ta.{'\n'}Un compromis votat de toți.
        </Text>
        <Body style={styles.lead}>
          CityMind adună părerile oamenilor despre o problemă a orașului, găsește ce îi unește și propune un compromis pe care îl
          votează toată lumea, live.
        </Body>
        <View style={styles.actions}>
          <Button title="Participă acum" arrow onPress={() => router.navigate('/participa')} />
          <Button title="Vezi rundele live" variant="outline" onPress={() => router.navigate('/board')} />
        </View>
        <Text style={[styles.meta, { color: colors.subtle }]}>Fără cont · voce sau text · sub un minut</Text>
      </View>

      <View style={styles.strip}>
        <Text style={[styles.meta, { color: colors.subtle }]}>Construit cu</Text>
        <View style={styles.stripNames}>
          {BUILT_WITH.map(name => (
            <Text key={name} style={[styles.stripItem, { color: colors.subtle }]}>{name}</Text>
          ))}
        </View>
      </View>

      {FEATURES.map(f => (
        <Card key={f.title} style={styles.feature}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
          <Body subtle style={styles.small}>{f.text}</Body>
          {f.shape}
        </Card>
      ))}

      <View style={styles.statement}>
        <Text style={[titleStyle(section), { color: colors.text, letterSpacing: -section * 0.04 }]}>
          Nu căutăm cine e majoritatea. <Text style={{ color: colors.accent }}>Căutăm ce ne unește pe toți.</Text>
        </Text>
      </View>

      <View style={styles.sectionHead}>
        <Eyebrow>Cum participi</Eyebrow>
        <Text style={[titleStyle(section), { color: colors.text, letterSpacing: -section * 0.04 }]}>Patru pași,{'\n'}un singur oraș.</Text>
      </View>
      <View>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.rail}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </LinearGradient>
              {i < STEPS.length - 1 ? <View style={[styles.railLine, { backgroundColor: colors.line }]} /> : null}
            </View>
            <View style={styles.stepBody}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{s.title}</Text>
              <Body subtle style={styles.small}>{s.text}</Body>
            </View>
          </View>
        ))}
      </View>

      {/* the site's purple CTA panel */}
      <LinearGradient colors={colors.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
        <LinearGradient colors={['rgba(196,148,255,0.5)', 'rgba(196,148,255,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.7 }} style={StyleSheet.absoluteFill} />
        <Eyebrow color="#d9fbfe">Pentru cetățeni</Eyebrow>
        <Text style={[titleStyle(section), styles.ctaTitle, { letterSpacing: -section * 0.04 }]}>Spui ce crezi în mai puțin de un minut.</Text>
        <Text style={styles.ctaText}>Vorbești sau scrii, apoi votezi ideile celorlalți. Fără cont.</Text>
        <Button title="Spune-ți părerea" arrow color="#fcfdff" labelColor="#0f0f16" onPress={() => router.navigate('/participa')} />
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 40, height: 40, borderRadius: 12 },
  gear: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  hero: { alignItems: 'center', gap: 22, paddingTop: 40, paddingBottom: 24 },
  headline: { textAlign: 'center' },
  lead: { fontSize: 18, lineHeight: 27, textAlign: 'center' },
  actions: { gap: 12, alignSelf: 'stretch' },
  meta: { fontFamily: FONTS.mono, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  strip: { alignItems: 'center', gap: 14, paddingBottom: 40 },
  stripNames: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22, rowGap: 8 },
  stripItem: { fontFamily: FONTS.bold, fontSize: 18, letterSpacing: -0.5 },
  feature: { minHeight: 300, gap: 12, padding: 24 },
  featureTitle: { fontFamily: FONTS.bold, fontSize: 21, letterSpacing: -0.45, lineHeight: 25 },
  small: { fontSize: 16, lineHeight: 23 },
  statement: { paddingVertical: 48 },
  sectionHead: { gap: 12, marginBottom: 8 },
  step: { flexDirection: 'row', gap: 16 },
  rail: { alignItems: 'center' },
  stepNumber: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 17 },
  railLine: { width: 2, flex: 1, marginVertical: 6 },
  stepBody: { flex: 1, gap: 4, paddingTop: 8, paddingBottom: 28 },
  cta: { borderRadius: 28, padding: 26, gap: 16, marginTop: 24, overflow: 'hidden' },
  ctaTitle: { color: '#fcfdff' },
  ctaText: { color: 'rgba(252,253,255,0.9)', fontFamily: FONTS.regular, fontSize: 17, lineHeight: 25, marginBottom: 6 },
});
