// Acasă: the site's landing page (components/site/hero, features, steps, closing), as one phone column.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from '../../components/SymbolView';
import { Body, Button, Card, Eyebrow, GradientBar, Screen, Title } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import { FONTS, GRADIENT, VIOLET } from '../../theme';

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

export default function Home() {
  const { colors } = useAppContext();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.brand}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={[styles.wordmark, { color: colors.text }]}>citymind</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Setări" style={styles.gear}>
          <SymbolView name="gearshape.fill" size={24} tintColor={colors.subtle} />
        </Pressable>
      </View>
      <GradientBar />

      <View style={styles.hero}>
        <Title size={42}>Orașul tău. Vocea ta.</Title>
        <Title size={42} style={{ color: colors.accent }}>Un compromis votat de toți.</Title>
        <Body>
          CityMind adună părerile oamenilor despre o problemă a orașului, găsește ce îi unește și propune un compromis pe care îl
          votează toată lumea, live.
        </Body>
        <Button title="Participă acum" onPress={() => router.navigate('/participa')} />
        <Button title="Vezi rundele live" variant="outline" onPress={() => router.navigate('/board')} />
        <Body subtle style={styles.center}>Fără cont · voce sau text · sub un minut</Body>
      </View>

      <Eyebrow>Principiile noastre</Eyebrow>
      {PRINCIPLES.map(p => (
        <Card key={p.title}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{p.title}</Text>
          <Body subtle>{p.text}</Body>
        </Card>
      ))}

      <Eyebrow>Cum participi</Eyebrow>
      <Title size={30}>Patru pași, un singur oraș.</Title>
      {STEPS.map((s, i) => (
        <Card key={s.title} style={styles.step}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{i + 1}</Text>
          </LinearGradient>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{s.title}</Text>
            <Body subtle>{s.text}</Body>
          </View>
        </Card>
      ))}

      {/* the site's purple CTA panel */}
      <View style={[styles.cta, { backgroundColor: VIOLET }]}>
        <Text style={styles.ctaTitle}>Nu căutăm cine e majoritatea. Căutăm ce ne unește pe toți.</Text>
        <Button title="Spune-ți părerea" color="#ffffff" labelColor="#0f0f16" onPress={() => router.navigate('/participa')} style={styles.ctaButton} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  wordmark: { fontFamily: FONTS.extrabold, fontSize: 26, letterSpacing: -1, flex: 1 },
  gear: { padding: 4 },
  hero: { gap: 14, marginBottom: 12 },
  center: { textAlign: 'center', fontSize: 14 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18, letterSpacing: -0.3 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNumber: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
  cta: { borderRadius: 24, padding: 24, gap: 20, marginTop: 8 },
  ctaTitle: { color: '#fcfdff', fontFamily: FONTS.extrabold, fontSize: 28, lineHeight: 30, letterSpacing: -1 },
  ctaButton: { alignSelf: 'stretch' },
});
