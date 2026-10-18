// Structured JSON lines for Cloud Logging. Never log document contents or ID numbers.

type Fields = Record<string, unknown>;

function write(severity: string, fields: Fields, message: string) {
    console.log(JSON.stringify({ severity, message, ...fields }));
}

export const logger = {
    info: (fields: Fields, message: string) => write('INFO', fields, message),
    warn: (fields: Fields, message: string) => write('WARNING', fields, message),
    error: (fields: Fields, message: string) => write('ERROR', fields, message),
};
