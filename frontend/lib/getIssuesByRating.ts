const getIssueTypesByRating = (rating: number) => {
  const baseIssueTypes = {
    // Issues for poor network experience (rating 1)
    poor: [
      {
        id: "no-connection",
        label: "No Network Connection",
        icon: "warning-outline",
        severity: "critical",
      },
      {
        id: "very-slow-data",
        label: "Extremely Slow Data Speeds",
        icon: "wifi-outline",
        severity: "critical",
      },
      {
        id: "frequent-call-drops",
        label: "Frequent Call Drops",
        icon: "call-outline",
        severity: "critical",
      },
      {
        id: "no-internet",
        label: "Can't Access Internet",
        icon: "globe-outline",
        severity: "critical",
      },
      {
        id: "weak-signal",
        label: "Very Weak Signal Strength",
        icon: "cellular-outline",
        severity: "critical",
      },
      {
        id: "network-timeout",
        label: "Network Timeouts",
        icon: "time-outline",
        severity: "high",
      },
    ],

    // Issues for fair network experience (rating 2)
    fair: [
      {
        id: "slow-data",
        label: "Slow Data Speeds",
        icon: "wifi-outline",
        severity: "high",
      },
      {
        id: "poor-call-quality",
        label: "Poor Call Quality/Static",
        icon: "call-outline",
        severity: "high",
      },
      {
        id: "video-streaming",
        label: "Video Streaming Issues",
        icon: "videocam-outline",
        severity: "medium",
      },
      {
        id: "web-loading",
        label: "Web Pages Load Slowly",
        icon: "globe-outline",
        severity: "medium",
      },
      {
        id: "unstable-connection",
        label: "Unstable Connection",
        icon: "warning-outline",
        severity: "medium",
      },
      {
        id: "low-signal",
        label: "Low Signal Strength",
        icon: "cellular-outline",
        severity: "medium",
      },
    ],

    // Issues for good network experience (rating 3)
    good: [
      {
        id: "occasional-slowdown",
        label: "Occasional Network Slowdowns",
        icon: "wifi-outline",
        severity: "low",
      },
      {
        id: "video-quality",
        label: "Video Quality Sometimes Drops",
        icon: "videocam-outline",
        severity: "low",
      },
      {
        id: "peak-hours",
        label: "Slower During Peak Hours",
        icon: "time-outline",
        severity: "low",
      },
      {
        id: "location-issues",
        label: "Weak Signal in Some Areas",
        icon: "location-outline",
        severity: "low",
      },
      {
        id: "upload-speed",
        label: "Upload Speeds Could Be Better",
        icon: "cloud-upload-outline",
        severity: "low",
      },
    ],

    // Minor issues for great network experience (rating 4)
    great: [
      {
        id: "speed-optimization",
        label: "Network Could Be Even Faster",
        icon: "flash-outline",
        severity: "low",
      },
      {
        id: "coverage-gaps",
        label: "Minor Coverage Gaps",
        icon: "cellular-outline",
        severity: "low",
      },
      {
        id: "latency",
        label: "Slight Network Latency",
        icon: "speedometer-outline",
        severity: "low",
      },
      {
        id: "indoor-signal",
        label: "Indoor Signal Could Improve",
        icon: "home-outline",
        severity: "low",
      },
    ],

    // Excellent network experience (rating 5)
    excellent: [
      {
        id: "no-issue",
        label: "Network Performance is Excellent",
        icon: "checkmark-circle-outline",
        severity: "no",
      },
      {
        id: "general-feedback",
        label: "General Network Feedback",
        icon: "chatbubble-outline",
        severity: "no",
      },
      {
        id: "feature-suggestion",
        label: "Network Feature Suggestion",
        icon: "bulb-outline",
        severity: "no",
      },
    ],
  };

  switch (rating) {
    case 1:
      return baseIssueTypes.poor;
    case 2:
      return baseIssueTypes.fair;
    case 3:
      return baseIssueTypes.good;
    case 4:
      return baseIssueTypes.great;
    case 5:
      return baseIssueTypes.excellent;
    default:
      return baseIssueTypes.poor;
  }
};

export { getIssueTypesByRating };
