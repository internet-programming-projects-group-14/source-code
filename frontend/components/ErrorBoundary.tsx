// components/ErrorBoundary.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  colorScheme: "light" | "dark" | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <ErrorBoundaryWrapper>
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
            colorScheme={null} // Will be handled by the wrapper
          />
        </ErrorBoundaryWrapper>
      );
    }

    return this.props.children;
  }
}

// Wrapper to provide color scheme to error fallback
function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();

  return React.cloneElement(children as React.ReactElement, { colorScheme });
}

// Default error fallback component
function DefaultErrorFallback({
  error,
  resetError,
  colorScheme,
}: ErrorFallbackProps) {
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
          Oops! Something went wrong
        </Text>

        <Text style={[styles.message, { color: isDark ? "#ccc" : "#666" }]}>
          We&lsquo;re sorry, but something unexpected happened. Please try
          again.
        </Text>

        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text
              style={[
                styles.errorTitle,
                { color: isDark ? "#ff6b6b" : "#e74c3c" },
              ]}
            >
              Error Details (Development):
            </Text>
            <Text
              style={[
                styles.errorText,
                { color: isDark ? "#ffcccb" : "#c0392b" },
              ]}
            >
              {error.toString()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? "#007AFF" : "#007AFF" },
          ]}
          onPress={resetError}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Custom error fallback for navigation/routing errors
function NavigationErrorFallback({
  error,
  resetError,
  colorScheme,
}: ErrorFallbackProps) {
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
          Navigation Error
        </Text>

        <Text style={[styles.message, { color: isDark ? "#ccc" : "#666" }]}>
          There was a problem loading the app. This might be due to a routing
          issue or storage problem.
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isDark ? "#007AFF" : "#007AFF" },
          ]}
          onPress={resetError}
        >
          <Text style={styles.buttonText}>Restart App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
});

export { ErrorBoundary, NavigationErrorFallback };
