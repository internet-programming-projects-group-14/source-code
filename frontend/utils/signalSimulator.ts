export class SignalSimulator {
    private static currentSignal = -60; // Start with good signal
    private static isSimulating = false;
  
    static startSimulation(onSignalChange: (signal: number) => void): void {
      if (this.isSimulating) return;
      
      this.isSimulating = true;
      console.log('🔄 Signal simulation started');
  
      const interval = setInterval(() => {
        // Simulate signal fluctuation
        const variation = (Math.random() - 0.5) * 20; // ±10 dBm variation
        this.currentSignal = Math.max(-120, Math.min(-30, this.currentSignal + variation));
        
        onSignalChange(this.currentSignal);
        
        // Occasionally simulate poor signal for testing
        if (Math.random() < 0.1) { // 10% chance
          this.currentSignal = -95; // Poor signal
          console.log('📶 Simulating poor signal:', this.currentSignal);
        }
      }, 5000); // Update every 5 seconds
  
      // Stop simulation after 5 minutes for testing
      setTimeout(() => {
        clearInterval(interval);
        this.isSimulating = false;
        console.log('🛑 Signal simulation stopped');
      }, 5 * 60 * 1000);
    }
  
    static simulatePoorSignal(onSignalChange: (signal: number) => void): void {
      console.log('📶 Manually triggering poor signal simulation');
      this.currentSignal = -90;
      onSignalChange(this.currentSignal);
    }
  
    static simulateGoodSignal(onSignalChange: (signal: number) => void): void {
      console.log('📶 Manually triggering good signal simulation');
      this.currentSignal = -55;
      onSignalChange(this.currentSignal);
    }
  
    static getCurrentSignal(): number {
      return this.currentSignal;
    }
  }