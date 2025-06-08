export type NetworkMetrics = {
  signalStrength: number | null;
  networkType: string | null;
  carrier: string | null;
  frequency: string | null;
  bandwidth: string | null;
  cellId: string | null;
  pci: number | null;

  dataSpeed: number | null; // Download Mbps
  uploadSpeed: number | null; // Upload Mbps
  latency: number | null; // Ping time (ms)
  isConnected: boolean | null;

  throughput?: any; // From NetInfo.details (type varies by platform)

  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  } | null;

  device: {
    platform: string;
    model: string | null;
    osVersion: string | null;
    // appVersion: string | null;
  };
};
