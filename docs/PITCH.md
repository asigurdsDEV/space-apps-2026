# Kimchi Trenchers — Space Mission Design Game

## 60-second pitch

A student can name a satellite's instruments without seeing why a real mission cannot carry every instrument. We turn those engineering trade-offs into a mission they can design, fly and explain.

Players choose a launcher, spacecraft systems and science payload. The game connects those choices to mass, power, cost and communications budgets. They improve a design, run a mission and inspect the consequences. The learning goal is to explain a result: what constrained the mission, which choice changed it, and what they would try next.

Our architecture supports four cooperating roles: mission planning, spacecraft, science and communications/resources. One browser runs the simulation so the team works from one shared mission. A local mode keeps the activity available when a network connection fails.

NASA's CubeSat and small-spacecraft references inform the engineering concepts. Catalog values are simplified for classroom gameplay; we distinguish those values from measured NASA datasets.

The intended outcome is a student who can say, “Adding this instrument improves science, but we need to pay for its power, mass and data.”

## Presenter notes

- Present features as shipped only after checking `DEMO.md` rehearsal gates. The pitch describes the intended experience; an unmerged PR is not a live feature.
- Show one trade-off changing on screen, then explain its consequence. Use the same seed to compare designs.
- If asked about accuracy: this is an educational resource-budget model, not flight-qualified mission planning. See `NASA_SOURCES.md` for provenance.
- If asked about online play: browsers use PeerJS/WebRTC, the host is authoritative, no host migration. Local play is the venue-network fallback.
- For a next-step question: prioritize classroom usability testing, richer source-backed catalogs and feedback that helps students explain a failed design.
