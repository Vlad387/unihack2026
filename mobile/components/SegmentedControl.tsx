import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props<T> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  trackColor: string;
  activeColor: string;
  textColor: string;
  activeTextColor: string;
  compact?: boolean;
};

// Selector segmentat în stil iOS (o singură opțiune activă).
export default function SegmentedControl<T>({ options, value, onChange, trackColor, activeColor, textColor, activeTextColor, compact }: Props<T>) {
  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, compact && styles.segmentCompact, active && [styles.segmentActive, { backgroundColor: activeColor }]]}
          >
            <Text
              numberOfLines={1}
              style={[styles.text, compact && styles.textCompact, { color: active ? activeTextColor : textColor }, active && styles.textActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segmentCompact: { paddingVertical: 7 },
  segmentActive: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  text: { fontSize: 14, fontWeight: '500' },
  textCompact: { fontSize: 13 },
  textActive: { fontWeight: '600' },
});
