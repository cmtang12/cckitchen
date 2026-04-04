// Helper function to format cooking time
// Converts minutes to "h m" format for times >= 60 minutes
// Examples: 30 -> "30m", 60 -> "1h", 65 -> "1h 5m", 125 -> "2h 5m"
export function formatCookingTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  }
  return `${minutes}m`;
}
