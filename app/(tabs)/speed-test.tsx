import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import {
  ChevronLeft,
  Play,
  RotateCcw,
  Wifi,
  Zap,
  Clock,
  Signal,
  Download,
  Upload,
  Activity,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SpeedTestPageProps {
  onBack: () => void;
}

export default function SpeedTestPage({ onBack }: SpeedTestPageProps) {
  const [testState, setTestState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [currentPhase, setCurrentPhase] = useState<'download' | 'upload' | 'latency' | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    latency: 0,
    jitter: 0,
    packetLoss: 0,
  });
  const [realtimeSpeed, setRealtimeSpeed] = useState(0);

  const networkInfo = {
    serverLocation: 'New York, NY',
    serverDistance: '12.4 km',
    ipAddress: '192.168.1.105',
    isp: 'Verizon Wireless',
    networkType: '5G NR',
    frequency: '3.7 GHz',
  };

  const runSpeedTest = async () => {
    setTestState('running');
    setProgress(0);
    setResults({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0, packetLoss: 0 });

    // Latency Test
    setCurrentPhase('latency');
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    setResults((prev) => ({ ...prev, latency: Math.random() * 30 + 15, jitter: Math.random() * 5 + 1 }));

    // Download Test
    setCurrentPhase('download');
    setProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i);
      const currentSpeed = Math.random() * 60 + 20;
      setRealtimeSpeed(currentSpeed);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const finalDownload = Math.random() * 40 + 35;
    setResults((prev) => ({ ...prev, downloadSpeed: finalDownload }));

    // Upload Test
    setCurrentPhase('upload');
    setProgress(0);
    for (let i = 0; i <= 100; i += 8) {
      setProgress(i);
      const currentSpeed = Math.random() * 20 + 8;
      setRealtimeSpeed(currentSpeed);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    const finalUpload = Math.random() * 15 + 10;
    setResults((prev) => ({ ...prev, uploadSpeed: finalUpload, packetLoss: Math.random() * 0.5 }));

    setCurrentPhase(null);
    setTestState('completed');
    setRealtimeSpeed(0);
  };

  const resetTest = () => {
    setTestState('idle');
    setCurrentPhase(null);
    setProgress(0);
    setResults({ downloadSpeed: 0, uploadSpeed: 0, latency: 0, jitter: 0, packetLoss: 0 });
    setRealtimeSpeed(0);
  };

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'latency':
        return 'Testing Network Latency...';
      case 'download':
        return 'Measuring Download Throughput...';
      case 'upload':
        return 'Measuring Upload Throughput...';
      default:
        return 'Initializing Speed Test...';
    }
  };

  const getSpeedQuality = (speed: number, type: 'download' | 'upload') => {
    const threshold = type === 'download' ? 25 : 10;
    if (speed >= threshold * 2) return { label: 'Excellent', color: '#10b981' };
    if (speed >= threshold * 1.5) return { label: 'Very Good', color: '#22c55e' };
    if (speed >= threshold) return { label: 'Good', color: '#eab308' };
    if (speed >= threshold * 0.5) return { label: 'Fair', color: '#f97316' };
    return { label: 'Poor', color: '#ef4444' };
  };

  const Badge = ({ children, color = '#6b7280' }: { children: React.ReactNode; color?: string }) => (
    <View style={[styles.badge, { backgroundColor: color + '33', borderColor: color + '66' }]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: any }) => (
    <BlurView intensity={20} style={[styles.card, style]}>
      {children}
    </BlurView>
  );

  const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 76;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer}>
        <Svg width={160} height={160} style={styles.circularProgress}>
          <Circle
            cx={80}
            cy={80}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={8}
            fill="none"
          />
          <Circle
            cx={80}
            cy={80}
            r={radius}
            stroke="#10b981"
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 80 80)`}
          />
        </Svg>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#111827', '#334155', '#1f2937']}
        style={styles.gradient}
      >
        {/* Header */}
        <BlurView intensity={20} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <ChevronLeft color="#ffffff" size={24} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Network Speed Test</Text>
              <Text style={styles.headerSubtitle}>Comprehensive throughput analysis</Text>
            </View>
          </View>
        </BlurView>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Server Information */}
          <Card>
            <View style={styles.cardHeader}>
              <Signal color="#10b981" size={20} />
              <Text style={styles.cardTitle}>Test Server Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Server Location</Text>
                  <Text style={styles.infoValue}>{networkInfo.serverLocation}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Distance</Text>
                  <Text style={styles.infoValue}>{networkInfo.serverDistance}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Your IP</Text>
                  <Text style={styles.infoValue}>{networkInfo.ipAddress}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>ISP</Text>
                  <Text style={styles.infoValue}>{networkInfo.isp}</Text>
                </View>
              </View>
              <View style={styles.badgeContainer}>
                <Badge color="#a855f7">{networkInfo.networkType}</Badge>
                <Badge color="#3b82f6">{networkInfo.frequency}</Badge>
              </View>
            </View>
          </Card>

          {/* Speed Test Interface */}
          <Card>
            {testState === 'idle' && (
              <View style={styles.testInterface}>
                <View style={styles.idleContainer}>
                  <LinearGradient
                    colors={['#10b98133', '#3b82f633']}
                    style={styles.idleIcon}
                  >
                    <Wifi color="#ffffff" size={64} />
                  </LinearGradient>
                  <View style={styles.idleText}>
                    <Text style={styles.idleTitle}>Ready to Test</Text>
                    <Text style={styles.idleSubtitle}>
                      Measure your network&apos;s download, upload speeds and latency
                    </Text>
                  </View>
                  <TouchableOpacity onPress={runSpeedTest} style={styles.startButton}>
                    <Play color="#ffffff" size={20} />
                    <Text style={styles.startButtonText}>Start Speed Test</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {testState === 'running' && (
              <View style={styles.testInterface}>
                <View style={styles.runningContainer}>
                  <View style={styles.progressContainer}>
                    <CircularProgress progress={progress} />
                    <View style={styles.progressContent}>
                      {currentPhase === 'latency' && <Clock color="#eab308" size={32} />}
                      {currentPhase === 'download' && <Download color="#3b82f6" size={32} />}
                      {currentPhase === 'upload' && <Upload color="#a855f7" size={32} />}
                      <Text style={styles.progressValue}>
                        {currentPhase === 'latency' ? `${progress}%` : `${realtimeSpeed.toFixed(1)}`}
                      </Text>
                      <Text style={styles.progressUnit}>
                        {currentPhase === 'latency' ? 'Progress' : 'Mbps'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.runningText}>
                    <Text style={styles.runningTitle}>{getPhaseLabel()}</Text>
                    <Text style={styles.runningSubtitle}>
                      Please wait while we analyze your connection
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {testState === 'completed' && (
              <View style={styles.testInterface}>
                <View style={styles.completedContainer}>
                  <View style={styles.completedHeader}>
                    <Text style={styles.completedTitle}>Test Complete</Text>
                    <Text style={styles.completedSubtitle}>Your network performance results</Text>
                  </View>

                  <View style={styles.resultsGrid}>
                    <View style={styles.resultCard}>
                      <Download color="#3b82f6" size={24} />
                      <Text style={styles.resultValue}>{results.downloadSpeed.toFixed(1)}</Text>
                      <Text style={styles.resultLabel}>Mbps Download</Text>
                      <Badge color={getSpeedQuality(results.downloadSpeed, 'download').color}>
                        {getSpeedQuality(results.downloadSpeed, 'download').label}
                      </Badge>
                    </View>

                    <View style={styles.resultCard}>
                      <Upload color="#a855f7" size={24} />
                      <Text style={styles.resultValue}>{results.uploadSpeed.toFixed(1)}</Text>
                      <Text style={styles.resultLabel}>Mbps Upload</Text>
                      <Badge color={getSpeedQuality(results.uploadSpeed, 'upload').color}>
                        {getSpeedQuality(results.uploadSpeed, 'upload').label}
                      </Badge>
                    </View>
                  </View>

                  <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                      <Clock color="#eab308" size={20} />
                      <Text style={styles.metricValue}>{results.latency.toFixed(0)}</Text>
                      <Text style={styles.metricLabel}>ms Latency</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Activity color="#f97316" size={20} />
                      <Text style={styles.metricValue}>{results.jitter.toFixed(1)}</Text>
                      <Text style={styles.metricLabel}>ms Jitter</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Zap color="#ef4444" size={20} />
                      <Text style={styles.metricValue}>{results.packetLoss.toFixed(2)}</Text>
                      <Text style={styles.metricLabel}>% Loss</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={resetTest} style={styles.actionButton}>
                      <RotateCcw color="#ffffff" size={16} />
                      <Text style={styles.actionButtonText}>Test Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Share Results</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Technical Details */}
          {testState === 'completed' && (
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Technical Analysis</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.technicalGrid}>
                  <View style={styles.technicalItem}>
                    <Text style={styles.infoLabel}>Test Duration</Text>
                    <Text style={styles.infoValue}>45.2 seconds</Text>
                  </View>
                  <View style={styles.technicalItem}>
                    <Text style={styles.infoLabel}>Data Transferred</Text>
                    <Text style={styles.infoValue}>127.4 MB</Text>
                  </View>
                  <View style={styles.technicalItem}>
                    <Text style={styles.infoLabel}>Peak Download</Text>
                    <Text style={styles.infoValue}>{(results.downloadSpeed * 1.2).toFixed(1)} Mbps</Text>
                  </View>
                  <View style={styles.technicalItem}>
                    <Text style={styles.infoLabel}>Peak Upload</Text>
                    <Text style={styles.infoValue}>{(results.uploadSpeed * 1.15).toFixed(1)} Mbps</Text>
                  </View>
                </View>

                <View style={styles.performanceRating}>
                  <Text style={styles.performanceTitle}>Performance Rating</Text>
                  <View style={styles.performanceItems}>
                    <View style={styles.performanceItem}>
                      <Text style={styles.performanceLabel}>Streaming (4K)</Text>
                      <Badge color={results.downloadSpeed >= 25 ? '#10b981' : '#ef4444'}>
                        {results.downloadSpeed >= 25 ? 'Excellent' : 'Limited'}
                      </Badge>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text style={styles.performanceLabel}>Video Calls</Text>
                      <Badge color={results.uploadSpeed >= 5 ? '#10b981' : '#f97316'}>
                        {results.uploadSpeed >= 5 ? 'Excellent' : 'Good'}
                      </Badge>
                    </View>
                    <View style={styles.performanceItem}>
                      <Text style={styles.performanceLabel}>Gaming</Text>
                      <Badge color={results.latency <= 50 ? '#10b981' : '#eab308'}>
                        {results.latency <= 50 ? 'Excellent' : 'Good'}
                      </Badge>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          )}

          {/* Historical Results */}
          <Card style={styles.lastCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Test History</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.historyItems}>
                <View style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyTime}>Today, 2:30 PM</Text>
                    <Text style={styles.historyLocation}>Downtown Area</Text>
                  </View>
                  <View style={styles.historyResults}>
                    <Text style={styles.historySpeed}>42.1 / 11.8 Mbps</Text>
                    <Text style={styles.historyLatency}>23ms latency</Text>
                  </View>
                </View>
                <View style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyTime}>Yesterday, 6:45 PM</Text>
                    <Text style={styles.historyLocation}>Home</Text>
                  </View>
                  <View style={styles.historyResults}>
                    <Text style={styles.historySpeed}>38.7 / 9.2 Mbps</Text>
                    <Text style={styles.historyLatency}>31ms latency</Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  gradient: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  lastCard: {
    marginBottom: 32,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoItem: {
    width: '50%',
    paddingBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  testInterface: {
    padding: 24,
  },
  idleContainer: {
    alignItems: 'center',
  },
  idleIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  idleText: {
    alignItems: 'center',
    marginBottom: 24,
  },
  idleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  idleSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  runningContainer: {
    alignItems: 'center',
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  circularProgressContainer: {
    position: 'absolute',
  },
  circularProgress: {
    transform: [{ rotate: '-90deg' }],
  },
  progressContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 60,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  progressUnit: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  runningText: {
    alignItems: 'center',
  },
  runningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  runningSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  completedContainer: {
    alignItems: 'center',
  },
  completedHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  resultsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  resultCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  technicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  technicalItem: {
    width: '50%',
    paddingBottom: 12,
  },
  performanceRating: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  performanceItems: {
    gap: 8,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  historyItems: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  historyTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  historyLocation: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  historyResults: {
    alignItems: 'flex-end',
  },
  historySpeed: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  historyLatency: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
});