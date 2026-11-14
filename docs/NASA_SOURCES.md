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

## Additional references confirmed with the catalog owner

- [Design and Develop Science Missions, March 26, 2025](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf): NASA systems-engineering webinar; page 8 identifies launch, space, ground and user segments. Supports the game's mission-system framing.
- [Goddard Mission Design Lab](https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/): collaborative mission concepts and subsystem trade studies, including mass, power and data-rate estimates. Supports role cooperation as an educational design choice.
- [General Mission Analysis Tool catalog entry](https://software.nasa.gov/software/GSC-19468-1): NASA's orbit/mission-analysis software reference. The game does not run GMAT or claim GMAT-validated trajectories.

Catalog owner confirmed these as conceptual references in PR #8; the values remain educational approximations. The owner supplied a legacy CubeSat 101 URL; the PDF link above is the verified NASA-hosted equivalent.
