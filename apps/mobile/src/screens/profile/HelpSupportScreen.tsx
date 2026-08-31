import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';

const FAQS = [
  {
    question: 'What is Masheleni (MSH)?',
    answer: 'Masheleni is the digital currency of Guranda. It is used across the entire ecosystem for transactions, payments, games, and content contribution rewards.',
  },
  {
    question: 'How do I earn MSH?',
    answer: 'You can earn MSH by sharing "of the Day" stories (OOTD, COTD — any label you like), having users rate/comment on your creations, winning game tournaments, or participating in the community.',
  },
  {
    question: 'How do I verify my account?',
    answer: 'Navigate to Profile > Account Verification. Submit your personal information, a picture of your government ID, and a selfie. Approval typically takes 24 hours.',
  },
  {
    question: 'Are transactions on-chain?',
    answer: 'Yes. Guranda utilizes the XRP Ledger (XRPL) for fast, low-cost, self-custodial transactions. You can manage your wallet natively through the app.',
  },
];

export default function HelpSupportScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Ticket form
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketCategory, setTicketCategory] = useState('General');
  const [ticketDesc, setTicketDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Legal Modal
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalTitle, setLegalTitle] = useState('');
  const [legalContent, setLegalContent] = useState('');

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleSubmitTicket = () => {
    if (!ticketTitle || !ticketDesc) {
      Alert.alert('Error', 'Please fill in the title and description');
      return;
    }

    setSubmitting(true);
    // Simulate API Submission
    setTimeout(() => {
      setSubmitting(false);
      const ticketNum = Math.floor(100000 + Math.random() * 900000);
      Alert.alert(
        'Ticket Submitted',
        `Support ticket #${ticketNum} has been successfully submitted. Our team will contact you shortly.`,
        [{ text: 'OK' }]
      );
      setTicketTitle('');
      setTicketDesc('');
      setTicketCategory('General');
    }, 1500);
  };

  const openLegalModal = (title: string, text: string) => {
    setLegalTitle(title);
    setLegalContent(text);
    setLegalModalVisible(true);
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING, RADIUS }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    content: { padding: SPACING.lg },
    sectionTitle: {
      ...TYPOGRAPHY.label,
      fontSize: 12,
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    card: {
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      marginBottom: SPACING.lg,
      overflow: 'hidden',
    },
    faqRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    faqQuestion: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: '600',
      flex: 1,
      marginRight: SPACING.md,
    },
    faqAnswerContainer: {
      paddingBottom: SPACING.md,
    },
    faqAnswer: {
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    divider: { height: 1, backgroundColor: COLORS.glassBorder },
    formGroup: { marginBottom: SPACING.md },
    label: {
      ...TYPOGRAPHY.label,
      fontSize: 11,
      marginBottom: SPACING.xs,
    },
    categoryRow: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    catBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      backgroundColor: COLORS.surface,
    },
    catBtnActive: {
      borderColor: COLORS.primary,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
    },
    catBtnText: {
      color: COLORS.textMuted,
      fontWeight: '600',
      fontSize: 12,
    },
    catBtnTextActive: {
      color: COLORS.primary,
    },
    input: {
      backgroundColor: COLORS.surface,
      color: COLORS.text,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    textArea: { minHeight: 80 },
    submitBtn: {
      backgroundColor: COLORS.primary,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    submitBtnText: {
      ...TYPOGRAPHY.button,
      color: '#FFF',
    },
    legalLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.xxl,
    },
    legalLinkText: {
      color: COLORS.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    legalLinkSeparator: {
      color: COLORS.textMuted,
      marginHorizontal: SPACING.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    modalContent: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    legalBodyText: {
      color: COLORS.text,
      fontSize: 14,
      lineHeight: 22,
    },
    closeModalBtn: {
      backgroundColor: COLORS.border,
      padding: 12,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      marginTop: SPACING.lg,
    },
    closeModalBtnText: {
      color: COLORS.text,
      fontWeight: '700',
    },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.card}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <View key={index}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.faqRow}
                  activeOpacity={0.7}
                  onPress={() => toggleFaq(index)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Contact form */}
        <Text style={styles.sectionTitle}>Submit a Support Ticket</Text>
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {['General', 'Wallet', 'Bugs', 'Other'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, ticketCategory === cat && styles.catBtnActive]}
                  onPress={() => setTicketCategory(cat)}
                >
                  <Text style={[styles.catBtnText, ticketCategory === cat && styles.catBtnTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={ticketTitle}
              onChangeText={setTicketTitle}
              placeholder="Brief summary of the issue"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={ticketDesc}
              onChangeText={setTicketDesc}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitTicket} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Legal links */}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => openLegalModal('Terms of Service', 'Welcome to Guranda. By using our service, you agree to our Terms of Service. These terms outline user behavior, self-custody responsibility of XRP Ledger wallets, content ownership of outfits uploaded, and masheleni usage rules. You must preserve your credentials securely, and not engage in abusive behavior.')}>
            <Text style={styles.legalLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>·</Text>
          <TouchableOpacity onPress={() => openLegalModal('Privacy Policy', 'Guranda values your privacy. We store profile credentials securely. Media uploads are served over secure CDNs. Wallet private seeds are never transferred to our servers in plaintext. Usage metrics and analytical details are solely aggregated to improve ecosystem user experiences.')}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Legal Document Modal */}
      <Modal visible={legalModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={TYPOGRAPHY.h2}>{legalTitle}</Text>
              <TouchableOpacity onPress={() => setLegalModalVisible(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.legalBodyText}>{legalContent}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setLegalModalVisible(false)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
