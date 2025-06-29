export async function measureThroughput() {
  // Use a larger file for more accurate measurement
  const testUrl = "https://speed.cloudflare.com/__down?bytes=5000000"; // 55MB
  // const testUrl = ""; // 25MB
  const expectedSizeBytes = 5 * 1024 * 1024; // 25MB in bytes

  try {

    // Add cache busting with timestamp
    const cacheBuster = Date.now() + Math.random();
    const urlWithCacheBuster = `${testUrl}&t=${cacheBuster}`;

    // Start timing before the fetch
    const startTime = performance.now();

    const response = await fetch(urlWithCacheBuster, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
      // Disable browser cache
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Network response was not ok: ${response.status} ${response.statusText}`
      );
    }

    // Use arrayBuffer for better compatibility and more accurate timing
    const data = await response.arrayBuffer();
    const endTime = performance.now();

    const downloadSize = data.byteLength;

    // Validate download completeness
    if (downloadSize < expectedSizeBytes * 0.95) {
      console.warn("Downloaded size is significantly smaller than expected");
      return {
        throughput: null,
        error: "Incomplete download",
        expected: expectedSizeBytes,
        actual: downloadSize,
      };
    }

    const timeInSeconds = (endTime - startTime) / 1000;

    // Ensure minimum test duration for accuracy
    if (timeInSeconds < 1.0) {
      console.warn("Download time is too short for accurate measurement");
      return {
        throughput: null,
        error: "Test duration too short",
        duration: timeInSeconds,
      };
    }

    // Calculate throughput in Mbps
    const throughputBps = downloadSize / timeInSeconds; // Bytes per second
    const throughputMbps = (throughputBps * 8) / (1024 * 1024); // Convert to Megabits per second
    return {
      throughput: throughputMbps.toFixed(2),
      downloadSize,
      duration: timeInSeconds.toFixed(3),
      bytesPerSecond: throughputBps.toFixed(0),
    };
  } catch (error) {
    console.error("Error measuring throughput:", error);
    return {
      throughput: null,
      error: error,
    };
  }
}

// Alternative function for multiple measurements
export async function measureThroughputAverage(numTests = 3) {
  console.log(`Running ${numTests} throughput tests...`);

  const results = [];

  for (let i = 0; i < numTests; i++) {
    console.log(`Test ${i + 1}/${numTests}`);

    // Wait between tests to avoid rate limiting
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const result = await measureThroughput();
    if (result.throughput) {
      results.push(parseFloat(result.throughput));
    }
  }

  if (results.length === 0) {
    return { throughput: null, error: "All tests failed" };
  }

  const average = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);

  return {
    throughput: average.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    testCount: results.length,
    allResults: results,
  };
}
