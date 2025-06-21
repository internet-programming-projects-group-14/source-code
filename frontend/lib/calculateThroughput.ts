export async function measureThroughput() {
  const testUrl = "https://example.com/testfile.dat"; // Replace with a real URL and file
  const fileSizeBytes = 1048576; // Example: 1MB in bytes
  let startTime, endTime, downloadSize;

  try {
    const response = await fetch(testUrl, { method: "GET" });
    if (!response.ok) throw new Error("Network response was not ok");

    startTime = new Date().getTime(); // Start timer
    const data = await response.blob(); // Download file
    endTime = new Date().getTime(); // End timer
    downloadSize = data.size;

    const timeInSeconds = (endTime - startTime) / 1000; // Time in seconds
    const throughputMbps = (downloadSize * 8) / timeInSeconds / 1_000_000; // Convert to Mbps

    return {
      throughput: throughputMbps.toFixed(2), // e.g., "5.23 Mbps"
    };
  } catch (error) {
    console.error("Error measuring throughput:", error);
    return { throughput: null };
  }
}
