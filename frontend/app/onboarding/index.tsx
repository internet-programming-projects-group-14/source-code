import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  ChevronRight,
  ChevronLeft,
  Signal,
  BarChart3,
  Users,
  Zap,
  MapPin,
  Bell,
  Shield,
  CheckCircle,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface Permissions {
  location: boolean;
  notifications: boolean;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [permissions, setPermissions] = useState<Permissions>({
    location: false,
    notifications: false,
  });

  const WelcomeContent = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.iconContainer}>
        <Signal size={64} color="#93C5FD" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.welcomeTitle}>Monitor Network Quality</Text>
        <Text style={styles.welcomeSubtitle}>
          Get real-time insights into your network performance with
          professional-grade analytics and community-driven data.
        </Text>
      </View>
    </View>
  );

  const FeaturesContent = () => (
    <View style={styles.featuresContainer}>
      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: "#3B82F620" }]}>
          <Signal size={24} color="#93C5FD" />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>Real-time Monitoring</Text>
          <Text style={styles.featureDescription}>
            Track signal strength, throughput, latency, and technical RF metrics
            in real-time.
          </Text>
        </View>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: "#A855F720" }]}>
          <Zap size={24} color="#C4B5FD" />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>Speed Testing</Text>
          <Text style={styles.featureDescription}>
            Comprehensive speed tests with detailed technical analysis and
            performance ratings.
          </Text>
        </View>
      </View>

      <View style={styles.featureItem}>
        <View style={[styles.featureIcon, { backgroundColor: "#10B98120" }]}>
          <BarChart3 size={24} color="#6EE7B7" />
        </View>
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>Analytics & Trends</Text>
          <Text style={styles.featureDescription}>
            Historical performance data with trends and detailed technical
            reports.
          </Text>
        </View>
      </View>
    </View>
  );

  const CommunityContent = () => (
    <View style={styles.communityContainer}>
      <View style={styles.communityHeader}>
        <View
          style={[
            styles.iconContainer,
            { width: 96, height: 96, marginBottom: 16 },
          ]}
        >
          <Users size={48} color="#6EE7B7" />
        </View>
        <Text style={styles.communityTitle}>Join the Network Community</Text>
        <Text style={styles.communitySubtitle}>
          Contribute to and benefit from real-time network quality data shared
          by users in your area.
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>50K+</Text>
          <Text style={styles.statLabel}>Active Contributors</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#60A5FA" }]}>2M+</Text>
          <Text style={styles.statLabel}>Data Points Daily</Text>
        </View>
      </View>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <CheckCircle size={20} color="#34D399" />
          <Text style={styles.benefitText}>
            Real-time area network quality reports
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <CheckCircle size={20} color="#34D399" />
          <Text style={styles.benefitText}>
            Anonymous and privacy-focused data sharing
          </Text>
        </View>
        <View style={styles.benefitItem}>
          <CheckCircle size={20} color="#34D399" />
          <Text style={styles.benefitText}>
            Geographic network performance insights
          </Text>
        </View>
      </View>
    </View>
  );

  const PermissionsContent = () => (
    <View style={styles.permissionsContainer}>
      <View style={styles.permissionItem}>
        <View style={styles.permissionHeader}>
          <View style={[styles.featureIcon, { backgroundColor: "#10B98120" }]}>
            <MapPin size={24} color="#6EE7B7" />
          </View>
          <View style={styles.permissionInfo}>
            <View style={styles.permissionTitleRow}>
              <Text style={styles.featureTitle}>Location Services</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <Text style={styles.permissionDescription}>
              Essential for geographic network analysis and area-specific
              insights. Your location data is anonymized and never shared.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.permissionButton,
            permissions.location && styles.permissionButtonEnabled,
          ]}
          onPress={() =>
            setPermissions((prev) => ({ ...prev, location: !prev.location }))
          }
        >
          {permissions.location && <CheckCircle size={16} color="white" />}
          <Text style={styles.permissionButtonText}>
            {permissions.location
              ? "Location Enabled"
              : "Enable Location Services"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.permissionItem}>
        <View style={styles.permissionHeader}>
          <View style={[styles.featureIcon, { backgroundColor: "#3B82F620" }]}>
            <Bell size={24} color="#93C5FD" />
          </View>
          <View style={styles.permissionInfo}>
            <View style={styles.permissionTitleRow}>
              <Text style={styles.featureTitle}>Notifications</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>Optional</Text>
              </View>
            </View>
            <Text style={styles.permissionDescription}>
              Receive prompts to share your network experience and get notified
              about significant network changes in your area.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.permissionButton,
            styles.permissionButtonOutline,
            permissions.notifications && styles.permissionButtonEnabledBlue,
          ]}
          onPress={() =>
            setPermissions((prev) => ({
              ...prev,
              notifications: !prev.notifications,
            }))
          }
        >
          {permissions.notifications && <CheckCircle size={16} color="white" />}
          <Text style={styles.permissionButtonText}>
            {permissions.notifications
              ? "Notifications Enabled"
              : "Enable Notifications"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.privacyNotice}>
        <Shield size={20} color="#93C5FD" />
        <View style={styles.privacyTextContainer}>
          <Text style={styles.privacyTitle}>Privacy First</Text>
          <Text style={styles.privacyDescription}>
            All data is anonymized and encrypted. You maintain full control over
            your privacy settings and can opt out at any time.
          </Text>
        </View>
      </View>
    </View>
  );

  const ReadyContent = () => (
    <View style={styles.readyContainer}>
      <View style={styles.iconContainer}>
        <CheckCircle size={64} color="#6EE7B7" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.welcomeTitle}>Ready to Begin</Text>
        <Text style={styles.welcomeSubtitle}>
          You&apos;re now ready to start monitoring your network quality and
          contributing to the community insights.
        </Text>
      </View>
      <View style={styles.readyStatsContainer}>
        <View style={styles.readyStatItem}>
          <Text style={styles.readyStatTitle}>Real-time Monitoring</Text>
          <Text style={styles.readyStatValue}>Active</Text>
        </View>
        <View style={styles.readyStatItem}>
          <Text style={styles.readyStatTitle}>Community Data</Text>
          <Text style={styles.readyStatValue}>Contributing</Text>
        </View>
      </View>
    </View>
  );

  const steps = [
    {
      id: "welcome",
      title: "Welcome to Network QoE Monitor",
      subtitle: "Professional network quality analysis at your fingertips",
      content: <WelcomeContent />,
    },
    {
      id: "features",
      title: "Comprehensive Network Analysis",
      subtitle: "Everything you need to understand your connection",
      content: <FeaturesContent />,
    },
    {
      id: "community",
      title: "Community-Powered Insights",
      subtitle: "Leverage crowdsourced network intelligence",
      content: <CommunityContent />,
    },
    {
      id: "permissions",
      title: "Enable Core Features",
      subtitle: "Grant permissions for optimal experience",
      content: <PermissionsContent />,
    },
    {
      id: "ready",
      title: "You're All Set!",
      subtitle: "Start monitoring your network quality",
      content: <ReadyContent />,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canProceed = currentStep !== 3 || permissions.location;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Signal size={16} color="#93C5FD" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Network QoE Monitor</Text>
              <Text style={styles.headerSubtitle}>
                Professional Network Analysis
              </Text>
            </View>
          </View>
          <View style={styles.progressDots}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index <= currentStep && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
          </View>
          <View style={styles.cardContent}>{currentStepData.content}</View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonOutline,
            currentStep === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentStep === 0}
        >
          <ChevronLeft size={16} color="white" />
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            !canProceed && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.navButtonText}>
            {isLastStep ? "Get Started" : "Continue"}
          </Text>
          <ChevronRight size={16} color="white" />
        </TouchableOpacity>
      </View>

      {currentStep === 3 && !permissions.location && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Location permission is required to continue
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  header: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#BFDBFE",
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  dotActive: {
    backgroundColor: "#60A5FA",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    minHeight: height * 0.6,
  },
  cardHeader: {
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
  cardContent: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  welcomeContainer: {
    alignItems: "center",
    gap: 24,
  },
  iconContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  featuresContainer: {
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
  },
  communityContainer: {
    gap: 24,
  },
  communityHeader: {
    alignItems: "center",
  },
  communityTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  communitySubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34D399",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  permissionsContainer: {
    gap: 16,
  },
  permissionItem: {
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  requiredBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
  },
  requiredText: {
    fontSize: 12,
    color: "#FCA5A5",
  },
  optionalBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.3)",
  },
  optionalText: {
    fontSize: 12,
    color: "#93C5FD",
  },
  permissionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 20,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    gap: 8,
  },
  permissionButtonOutline: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  permissionButtonEnabled: {
    backgroundColor: "#059669",
  },
  permissionButtonEnabledBlue: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  permissionButtonText: {
    fontSize: 14,
    color: "white",
    fontWeight: "500",
  },
  privacyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(147, 197, 253, 0.3)",
    gap: 12,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 18,
  },
  readyContainer: {
    alignItems: "center",
    gap: 24,
  },
  readyStatsContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  readyStatItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  readyStatTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    marginBottom: 4,
  },
  readyStatValue: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 16,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  navButtonOutline: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  navButtonPrimary: {
    backgroundColor: "#2563EB",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: "white",
    fontWeight: "500",
  },
  stepIndicator: {
    alignItems: "center",
  },
  stepText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  warningContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  warningText: {
    fontSize: 12,
    color: "#FB923C",
  },
});

export default OnboardingScreen;
