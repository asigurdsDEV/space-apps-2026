# NASA references and data provenance

Checked 2026-11-14. These are engineering references; they are not evidence that the game ingests a measured NASA dataset.

| Source | What it supports | How to describe its use |
|---|---|---|
| [NASA CubeSat 101](https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_cubesat_101_508.pdf) | Introductory mission-development concepts and process | Educational background for the design activity; catalog owner should identify any specific extracted quantity separately. |
| [NASA CubeSat Launch Initiative resources](https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/cubesat-launch-initiative-resources/) | Discovery page for CubeSat development, specifications and operations references | Link students to the primary documents; linked third-party specifications retain their own terms. |
| [NASA Small Spacecraft State-of-the-Art](https://www.nasa.gov/smallsat-institute/sst-soa/) | Small-spacecraft subsystem technology reference | Background for subsystem categories and trade-offs, not validation of invented part statistics. |
| [NASA Small Spacecraft Systems Virtual Institute](https://www.nasa.gov/smallsat-institute/) | Entry point for small-spacecraft resources | Further reading for students and educators. |

## Catalog provenance rules

The current data owner describes the catalogs as hand-tuned for gameplay and loosely based on NASA references. Treat part masses, prices, power, capacities and scores as **educational approximations** until a row-level source proves otherwise. Do not describe a hand-tuned catalog as downloaded NASA measurements or a real launch quote.

Each Dataset must carry the contract's `source`, `source_url`, `license`, `retrieved_utc` and `units`. For team-authored values, name the team as the value author and identify the NASA reference as conceptual background. A retrieval timestamp records when someone actually retrieved the source, not a publication date or a guess.

If a value is extracted later, record its document edition, page/table, original unit and conversion, plus any gameplay adjustment. Preserve the original citation. Mark synthetic values explicitly; keep SI units internally. Do not assume that every linked image, commercial table or third-party reference has NASA's reuse terms.

## Submission wording

“NASA CubeSat and small-spacecraft references informed the mission-design concepts. The prototype uses team-authored educational catalogs to make resource trade-offs playable.”

Only add “uses NASA data” with the exact dataset, imported file and transformation documented. Confirm this wording with the catalog owner before submission. No live NASA service or API key is required for the proposed static catalogs.
