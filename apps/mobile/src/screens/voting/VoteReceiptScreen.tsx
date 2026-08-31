import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

export default function VoteReceiptScreen({ route, navigation }: any) {
  const { electionId, positionTitle, vote } = route.params;
  const { theme } = useTheme();
  const { COLORS } = theme;
  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
    headerTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
    body: { flex: 1, paddingHorizontal: SPACING.lg, gap: 16 },
    hero: { alignItems: 'center', gap: 10, paddingTop: 6 },
    heroIcon: { width: 72, height: 72, borderRadius: 999, backgroundColor: `${COLORS.success}18`, borderWidth: 1, borderColor: `${COLORS.success}44`, justifyContent: 'center', alignItems: 'center' },
    heroTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
    heroSub: { color: COLORS.textMuted, fontSize: 12 },
    card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, gap: 12 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardLabel: { ...TYPOGRAPHY.label, fontSize: 10 },
    validPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${COLORS.success}22` },
    validPillText: { color: COLORS.success, fontSize: 9.5, fontWeight: '700' },
    fieldLabel: { color: COLORS.textMuted, fontSize: 10.5 },
    fieldValue: { color: COLORS.text, fontSize: 12.5, fontWeight: '600', fontFamily: 'monospace' },
    row: { flexDirection: 'row', gap: 20 },
    noteCard: { flexDirection: 'row', gap: 10, backgroundColor: `${COLORS.primary}12`, borderWidth: 1, borderColor: `${COLORS.primary}33`, borderRadius: 16, padding: 13 },
    noteText: { color: COLORS.text, fontSize: 11.5, flex: 1, lineHeight: 17 },
    explorerBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 999, padding: 13 },
    explorerBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    footer: { padding: SPACING.lg, gap: 10 },
    cta: { backgroundColor: COLORS.primary, borderRadius: 999, padding: 16, alignItems: 'center' },
    ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  }));

  const hash: string | undefined = vote?.xrplTxHash;
  const shortHash = hash ? `${hash.slice(0, 6)}…${hash.slice(-8)}` : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Vote recorded</Text></View>

      <View style={styles.body}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="checkmark" size={34} color={COLORS.success} /></View>
          <Text style={styles.heroTitle}>{positionTitle} ballot sealed</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>XRPL TRANSACTION RECEIPT</Text>
            <View style={styles.validPill}>
              <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: COLORS.success }} />
              <Text style={styles.validPillText}>VALIDATED</Text>
            </View>
          </View>

          <View>
            <Text style={styles.fieldLabel}>Transaction hash</Text>
            <Text style={styles.fieldValue}>{shortHash}</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Ledger index</Text>
              <Text style={styles.fieldValue}>{vote?.xrplLedgerIndex ?? '—'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Cast at</Text>
              <Text style={styles.fieldValue}>{vote?.castAt ? new Date(vote.castAt).toLocaleTimeString() : '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
          <Text style={styles.noteText}>This receipt proves your ballot was included and counted — it never reveals your selection. Vote secrecy is preserved by design.</Text>
        </View>

        {hash && (
          <TouchableOpacity style={styles.explorerBtn} onPress={() => Linking.openURL(`https://testnet.xrpl.org/transactions/${hash}`)}>
            <Text style={styles.explorerBtnText}>View on XRPL ledger explorer</Text>
            <Ionicons name="open-outline" size={15} color={COLORS.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.replace('ElectionDetail', { electionId })}>
          <Text style={styles.ctaText}>Continue voting</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
