// Single source of truth for the assistant's model, shared by the API route
// and the admin monitor so the dashboard can never claim the wrong model.
//
// Override in Liara: ASSISTANT_MODEL=gpt-4o-mini for cheaper tier after eval passes.
export const AI_MODEL = process.env.ASSISTANT_MODEL || 'gpt-5.4-mini'
