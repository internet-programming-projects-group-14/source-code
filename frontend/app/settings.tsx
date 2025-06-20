import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SystemConfiguration() {
  const [anonymizedTelemetry, setAnonymizedTelemetry] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [technicalMetrics, setTechnicalMetrics] = useState(true);
  const [qoeNotifications, setQoeNotifications] = useState(true);
  const [backgroundMonitoring, setBackgroundMonitoring] = useState(true);
  const [automatedSpeedTesting, setAutomatedSpeedTesting] = useState(true);
  const [cellularDataUsage, setCellularDataUsage] = useState(true);
  const [feedbackFrequency, setFeedbackFrequency] = useState('Normal Frequency');

  const frequencyOptions = [
    { id: 'low', label: 'Low Frequency', description: 'Once per day maximum' },
    { id: 'normal', label: 'Normal Frequency', description: '2-3 prompts per day' },
    { id: 'high', label: 'High Frequency', description: 'Every 2-4 hours' },
  ];

  const ToggleRow = ({
    title,
    description,
    value,
    onValueChange,
    showCritical = false
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    showCritical?: boolean;
  }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.toggleTitle}>{title}</Text>
          {showCritical && (
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalText}>Critical</Text>
            </View>
          )}
        </View>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#374151', true: '#3B82F6' }}
        thumbColor={value ? '#FFFFFF' : '#9CA3AF'}
      />
    </View>
  );

  const FrequencyOption = ({
    option,
    isSelected
  }: {
    option: typeof frequencyOptions[0];
    isSelected: boolean
  }) => (
    <TouchableOpacity
      style={[styles.frequencyOption, isSelected && styles.frequencyOptionSelected]}
      onPress={() => setFeedbackFrequency(option.label)}
    >
      <Text style={[styles.frequencyLabel, isSelected && styles.frequencyLabelSelected]}>
        {option.label}
      </Text>
      <Text style={[styles.frequencyDescription, isSelected && styles.frequencyDescriptionSelected]}>
        {option.description}
      </Text>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <View style={styles.selectedDot} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>System Configuration</Text>
          <Text style={styles.headerSubtitle}>Network monitoring preferences</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Privacy & Data Collection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sectionTitle}>Privacy & Data Collection</Text>
          </View>

          <ToggleRow
            title="Anonymized Telemetry"
            description="Share anonymous network performance data for analysis"
            value={anonymizedTelemetry}
            onValueChange={setAnonymizedTelemetry}
          />

          <ToggleRow
            title="Location Services"
            description="GPS coordinates for geographic network analysis"
            value={locationServices}
            onValueChange={setLocationServices}
            showCritical={true}
          />

          <ToggleRow
            title="Technical Metrics Collection"
            description="Include detailed RF and protocol-level data"
            value={technicalMetrics}
            onValueChange={setTechnicalMetrics}
          />
        </View>

        {/* Feedback & Monitoring */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sectionTitle}>Feedback & Monitoring</Text>
          </View>

          <ToggleRow
            title="QoE Prompt Notifications"
            description="Receive prompts to rate network experience"
            value={qoeNotifications}
            onValueChange={setQoeNotifications}
          />

          <ToggleRow
            title="Background Monitoring"
            description="Continuous network quality assessment"
            value={backgroundMonitoring}
            onValueChange={setBackgroundMonitoring}
          />

          <View style={styles.frequencySection}>
            <Text style={styles.frequencyTitle}>Feedback Collection Frequency</Text>
            {frequencyOptions.map((option) => (
              <FrequencyOption
                key={option.id}
                option={option}
                isSelected={feedbackFrequency === option.label}
              />
            ))}
          </View>
        </View>

        {/* Network Testing & Analysis */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wifi-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sectionTitle}>Network Testing & Analysis</Text>
          </View>

          <ToggleRow
            title="Automated Speed Testing"
            description="Periodic throughput measurements"
            value={automatedSpeedTesting}
            onValueChange={setAutomatedSpeedTesting}
          />

          <ToggleRow
            title="Cellular Data Usage"
            description="Allow testing over mobile connection"
            value={cellularDataUsage}
            onValueChange={setCellularDataUsage}
          />
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sectionTitle}>System Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>v2.1.4</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data Usage</Text>
              <Text style={styles.infoValue}>4.7 MB</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reports Sent</Text>
              <Text style={styles.infoValue}>127</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Sync</Text>
              <Text style={styles.infoValue}>2 min ago</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportButtonText}>Export Telemetry Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset Configuration</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  criticalBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  criticalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  frequencySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  frequencyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  frequencyOption: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    position: 'relative',
  },
  frequencyOptionSelected: {
    backgroundColor: '#1E40AF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  frequencyLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  frequencyLabelSelected: {
    color: '#FFFFFF',
  },
  frequencyDescription: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  frequencyDescriptionSelected: {
    color: '#BFDBFE',
  },
  selectedIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -6,
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
  },
  exportButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
});