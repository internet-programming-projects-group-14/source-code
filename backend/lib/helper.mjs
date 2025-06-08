export function generateUserId() {
  return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
}

export function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5)
  );
}
