// Acasă: the site's landing page (components/site/hero, features, steps, closing), rethought for one phone column.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from '../../components/SymbolView';
import { Body, Button, Card, Eyebrow, GradientText, Screen, Title, titleStyle } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import { FONTS, GRADIENT } from '../../theme';

const PRINCIPLES = [
  { title: 'Puncte comune, nu majorități', text: 'Căutăm ce acceptă fiecare tabără, oricât de mică, nu doar ce vrea cea mai mare.' },
  { title: 'AI-ul e mereu etichetat', text: 'Tot ce scrie AI-ul e marcat „Generat de AI”. Deciziile rămân ale oamenilor.' },
  { title: 'Doar voturi reale', text: 'Opiniile simulate apar separat, în altă culoare, și nu intră niciodată în procente.' },
  { title: 'Fără date personale', text: 'Nu cerem nume, telefon sau email. Mesajele cu date personale sunt filtrate.' },
];

const STEPS = [
  { title: 'Spune-ți părerea', text: 'Răspunzi cu vocea sau în scris. Fără cont, în mai puțin de un minut.' },
  { title: 'Votează ideile celorlalți', text: 'De acord, nu sunt de acord sau nu știu. Fiecare vot contează la fel.' },
  { title: 'Vezi unde te afli', text: 'Harta opiniilor arată taberele care se formează și locul tău printre ele.' },
  { title: 'Votează compromisul', text: 'AI-ul propune o soluție pornind de la punctele comune. Dacă nu trece pragul, o rescrie.' },
];

const BUILT_WITH = ['Gemini', 'FastAPI', 'PostgreSQL', 'pgvector', 'UMAP', 'HDBSCAN'];

export default function Home() {
  const { colors } = useAppContext();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.brand}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={[styles.wordmark, { color: colors.text }]}>citymind</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Setări" style={[styles.gear, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <SymbolView name="gearshape.fill" size={20} tintColor={colors.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Eyebrow>Consultare publică · live</Eyebrow>
        <Title size={46}>Orașul tău. Vocea ta.</Title>
        <Title size={46} gradient>Un compromis votat de toți.</Title>
        <Body style={styles.lead}>
          CityMind adună părerile oamenilor despre o problemă a orașului, găsește ce îi unește și propune un compromis pe care îl
          votează toată lumea, live.
        </Body>
        <View style={styles.actions}>
          <Button title="Participă acum" arrow onPress={() => router.navigate('/participa')} />
          <Button title="Vezi rundele live" variant="outline" onPress={() => router.navigate('/board')} />
        </View>
        <Text style={[styles.meta, { color: colors.faint }]}>Fără cont · voce sau text · sub un minut</Text>
      </View>

      <View style={[styles.strip, { borderColor: colors.line }]}>
        {BUILT_WITH.map(name => (
          <Text key={name} style={[styles.stripItem, { color: colors.faint }]}>{name}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Eyebrow>Principiile noastre</Eyebrow>
        <Title size={32}>Construit ca să fie corect.</Title>
      </View>
      {PRINCIPLES.map((p, i) => (
        <Card key={p.title} style={styles.principle}>
          <GradientText style={styles.principleNumber}>{String(i + 1).padStart(2, '0')}</GradientText>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{p.title}</Text>
            <Body subtle style={styles.small}>{p.text}</Body>
          </View>
        </Card>
      ))}

      <View style={styles.statement}>
        <Text style={[titleStyle(34), { color: colors.text }]}>
          Nu căutăm cine e majoritatea.{' '}
          <Text style={{ color: colors.accent }}>Căutăm ce ne unește pe toți.</Text>
        </Text>
      </View>

      <View style={styles.section}>
        <Eyebrow>Cum participi</Eyebrow>
        <Title size={32}>Patru pași, un singur oraș.</Title>
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
              <Text style={[styles.cardTitle, { color: colors.text }]}>{s.title}</Text>
              <Body subtle style={styles.small}>{s.text}</Body>
            </View>
          </View>
        ))}
      </View>

      {/* the site's purple CTA panel */}
      <LinearGradient colors={colors.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
        <LinearGradient colors={['rgba(196,148,255,0.5)', 'rgba(196,148,255,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.7 }} style={StyleSheet.absoluteFill} />
        <Eyebrow color="#d9fbfe">Pentru cetățeni</Eyebrow>
        <Text style={[titleStyle(34), styles.ctaTitle]}>Spui ce crezi în mai puțin de un minut.</Text>
        <Text style={styles.ctaText}>Vorbești sau scrii, apoi votezi ideile celorlalți. Fără cont.</Text>
        <Button title="Spune-ți părerea" arrow color="#fcfdff" labelColor="#0f0f16" onPress={() => router.navigate('/participa')} />
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 12 },
  wordmark: { fontFamily: FONTS.extrabold, fontSize: 26, letterSpacing: -1.1, flex: 1 },
  gear: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 14, paddingTop: 28, paddingBottom: 8 },
  lead: { fontSize: 18, lineHeight: 27, marginTop: 4 },
  actions: { gap: 10, marginTop: 8 },
  meta: { fontFamily: FONTS.mono, fontSize: 11.5, letterSpacing: 0.6, textAlign: 'center', marginTop: 2 },
  strip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 6, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14 },
  stripItem: { fontFamily: FONTS.semibold, fontSize: 14, letterSpacing: -0.2 },
  section: { gap: 10, marginTop: 28 },
  principle: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  principleNumber: { fontFamily: FONTS.mono, fontSize: 15, paddingTop: 3 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 19, letterSpacing: -0.4, lineHeight: 24 },
  small: { fontSize: 15.5, lineHeight: 22 },
  statement: { paddingVertical: 36 },
  step: { flexDirection: 'row', gap: 16 },
  rail: { alignItems: 'center' },
  stepNumber: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 17 },
  railLine: { width: 2, flex: 1, marginVertical: 6 },
  stepBody: { flex: 1, gap: 4, paddingTop: 8, paddingBottom: 28 },
  cta: { borderRadius: 28, padding: 26, gap: 16, marginTop: 20, overflow: 'hidden' },
  ctaTitle: { color: '#fcfdff' },
  ctaText: { color: 'rgba(252,253,255,0.9)', fontFamily: FONTS.regular, fontSize: 17, lineHeight: 25, marginBottom: 6 },
});
