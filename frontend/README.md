# Smoo-G Frontend

This folder contains the browser UI for the agent simulator.

## Current Prototype

Open `index.html` directly or serve the repo root with any static server.

The frontend currently supports:

- User-defined perspectives.
- Toggleable default and custom agents.
- Separate supervision windows per enabled agent.
- Simulated research/action traces.
- Developer settings for adapter source configuration.

## Next Integration Step

When the backend adapter layer is ready, replace the local simulated run loop with calls to:

- `GET /adapters` for runtime availability.
- `POST /runs` to start a supervised simulation.
- A future event stream endpoint for agent window updates.
