function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export const config = {
    port: Number(process.env.PORT ?? 8080),
    project: process.env.GOOGLE_CLOUD_PROJECT ?? required('GOOGLE_CLOUD_PROJECT'),
    location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
    model: process.env.GEMINI_MODEL ?? required('GEMINI_MODEL'),
    /** Full resource name: projects/<p>/locations/<loc>/processors/<id>. */
    docaiProcessor: process.env.DOCAI_PROCESSOR ?? null,
    docaiLocation: process.env.DOCAI_LOCATION ?? 'us',
    agentName: process.env.AGENT_NAME ?? 'Rachel Lim',
};
