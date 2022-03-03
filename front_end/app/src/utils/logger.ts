import { environment } from '@environments/environment';

enum LogLevel {
    ERROR = 'error',
    INFO = 'info',
    LOG = 'log',
    NONE = ''
}

const defaultConfig = {
    logProduction: false,
    logIdentifier: 'No logIdentifier provided in config',
    logLevel: LogLevel.LOG,
    logLoggerObject: false,
    prettyPrint: true
};

export class LoggerConfig {
    /**
     * Should this run on production
     */
    logProduction: boolean;

    /**
     * Title used to differentiate loggers. Added as title to trace when argument passed to errorOrAnyToLog is not an instance of Error.
     */
    logIdentifier: string;

    /**
     * Will log to console if level set to error, info, or log, and environment is not production or config is set to logProduction.
     */
    logLevel: LogLevel;

    /**
     * Log the NxLogger object instance or just the logged item and stack trace.
     */
    logLoggerObject: boolean;

    /**
     * Pretty print formats console output when logLoggerObject === false else prints { logged, trace }
     */
    prettyPrint: boolean;

    constructor(config: Partial<LoggerConfig> = {}) {
        Object.assign(this, { ...defaultConfig, ...config });
    }
}

export class NxLogger<T> {
    config: LoggerConfig;
    logIdentifier: string;
    logged: T;
    stack: string;

    constructor(
        config: Partial<LoggerConfig>,
        errorOrAnyToLog: T
    ) {
        this.config = new LoggerConfig(config);
        const { logProduction, logLevel, logLoggerObject, prettyPrint } = this.config;
        if (environment.production && !logProduction || !logLevel) {
            // Prevents logging in production
            return;
        }
        this.logIdentifier = config.logIdentifier;
        const isError = errorOrAnyToLog instanceof Error;
        this.logged = isError ? (<unknown>errorOrAnyToLog as any).message : errorOrAnyToLog;
        this.stack = (isError
            ? <unknown>errorOrAnyToLog as Error
            : new Error(this.config.logIdentifier)
        ).stack.replace('Error:', 'Logger Trace:');
        const log = console[logLevel];

        if (logLoggerObject) {
            // Logs the NxLogger object instead of just the couple properties returned later
            log(this);
            return;
        }

        if (isError) {
            this.stack = `Logger Trace: ${this.logIdentifier} \n ${this.logged}`;
        }

        const toLog = { logged: this.logged, trace: this.stack };

        if (!prettyPrint) {
            log(`%c Start of ${this.logIdentifier}`, 'background: green; color: white; padding: 0 200px;');
            log(toLog);
            log(`%c End of ${this.logIdentifier}`, 'background: green; color: white; padding: 0 200px;');
        } else {
            this.#prettyPrint(toLog, logLevel, this.config.logIdentifier);
        }
    }

    /**
     * The logCustom method accepts an LoggerConfig as an argument and returns a configured logger.
     *
     * The configured logger accepts whatever you want to log as a first argument.
     * Optionally you can override the logIdentifier from the config.
     * Useful if you wanted to reuse a config but update the identifier.
     */
    static logCustom = (
        config: Partial<LoggerConfig> = new LoggerConfig()
    ) => <T>(
        errorOrAnyToLog: T, logIdentifier = config.logIdentifier
    ) => new NxLogger<T>({ ...config, logIdentifier }, errorOrAnyToLog);

    // Helpers

    #prettyPrint = ({ logged, trace }, logLevel, identifier) => {
        const logBackground = {
            error: 'red',
            info: 'green',
            log: 'cyan'
        };

        const logColor = {
            error: 'white',
            info: 'white',
            log: 'navy'
        };
        const background = logBackground[logLevel];
        const color = logColor[logLevel];
        const headingFooterStyle = `font-size: 1.5em; background: ${background}; color: ${color}; `;
        const secondaryHeadingStyle = `font-size: 1.25em; background: ${color}; color: ${background}; padding: 1em 144px; `;
        const prettyHeading = [`%c ______ Start "${identifier}" ______`, headingFooterStyle + 'padding: 2.5em 72px 1em 72px; '];
        const prettyLoggedHeading = ['%c ______  Logged ______', secondaryHeadingStyle];
        const prettyLogged = [`%c ${JSON.stringify(logged, null, 4)}`, 'padding: 18px 36px; '];
        const prettyTraceHeading = ['%c ______  Stack Trace ______', secondaryHeadingStyle];
        const prettyTrace = trace.split(/\r?\n/g).map((line, index) => [
            `%c ${line}`,
            `font-size: ${
                !index ? '1.5em' : '1em'
            }; color: ${
                !index ? 'white' : 'black'
            }; background: ${
                !index ? 'black' : index % 2 ? 'white' : '#ddd'
            }; margin: 0; padding: 0.25em ${index ? '16px' : '72px'}; `
        ]);
        const prettyFooter = [`%c ^^^^^^ End "${identifier}" ^^^^^^`, headingFooterStyle + 'padding: 1em 72px 2.5em 72px; '];
        const logWithStyles = (styled: [string, string]) => console[logLevel](...styled);
        [
            prettyHeading,
            prettyLoggedHeading,
            prettyLogged,
            prettyTraceHeading,
            ...prettyTrace,
            prettyFooter
        ].forEach(logWithStyles);
    };
}
