// Single source of truth for the assistant's model, shared by the API route
// and the admin monitor so the dashboard can never claim the wrong model.
//
// Chosen by measurement against the real system prompt: gpt-4o-mini answers
// correctly but stiffly; gpt-5.4-mini gives more natural Persian and holds the
// grounding rules better, with the same request shape and price tier.
export const AI_MODEL = 'gpt-5.4-mini'
