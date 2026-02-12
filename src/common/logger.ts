/** Logging configuration for Nodrift. */

type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

let currentLevel: LogLevel = 'WARNING';

const logLevels: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4,
};

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `${timestamp} - nodrift - ${level} - ${message}`;
}

export function setupLogger(level: LogLevel = 'WARNING'): void {
  currentLevel = level;
}

export function getLogger(_name?: string): {
  debug: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  exception: (message: string, error?: Error) => void;
} {
  return {
    debug: (message: string) => {
      if (logLevels[currentLevel] <= logLevels.DEBUG) {
        console.error(formatMessage('DEBUG', message));
      }
    },
    info: (message: string) => {
      if (logLevels[currentLevel] <= logLevels.INFO) {
        console.error(formatMessage('INFO', message));
      }
    },
    warning: (message: string) => {
      if (logLevels[currentLevel] <= logLevels.WARNING) {
        console.error(formatMessage('WARNING', message));
      }
    },
    error: (message: string) => {
      if (logLevels[currentLevel] <= logLevels.ERROR) {
        console.error(formatMessage('ERROR', message));
      }
    },
    exception: (message: string, error?: Error) => {
      if (logLevels[currentLevel] <= logLevels.ERROR) {
        console.error(formatMessage('ERROR', message));
        if (error) {
          console.error(error);
        }
      }
    },
  };
}

