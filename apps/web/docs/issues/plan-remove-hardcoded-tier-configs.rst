☐ Phase 1: Server – Expose tier metadata via Convex
☐ Phase 2: Client – Fetch tier config via new hook & replace hard-coded values
☐ Phase 3: Cleanup – Delete duplicated constants & update tests

Phase 1 – Server: expose dynamic tier metadata
------------------------------------------------
Affected files
* **convex/stripe/pricing.ts** – export helper ``listPricingInfo()`` returning ``Array[{tier, name, monthly, yearly, colors}]`` where ``colors`` = ``{bg: "#F5DFA3", text: "#9A6B16", border: "#DDB960"}`` (gold palette shared by all tiers).
* **convex/pricing/getTierMetadata.ts** *(NEW query)* – **public** Convex query that calls ``listPricingInfo()`` and returns full metadata plus Stripe priceIds and gold color tokens.
* **convex/_tests_/pricing.test.ts** *(NEW)* – unit-test query returns expected structure.

Summary of changes
* Add pure helper ``listPricingInfo()`` to centralise logic and keep query tiny.
* New query ``pricing:getTierMetadata`` simply ``return listPricingInfo()``.
* Types: declare ``PricingTierMeta`` *(incl. ``colors`` field)* in **convex/stripe/pricing.ts** and export for client.
* Ensure query included in generated ``api``.

Unit tests
* Assert array length === known tiers.
* Each object contains keys ``tier``, ``name``, ``monthly``, ``yearly``, ``priceIds``, ``colors``.

Phase 2 – Client: replace hard-coded constants
---------------------------------------------
Affected files
* **hooks/use-tier-config.ts** *(NEW)* – wrapper around ``useQuery(api.pricing.getTierMetadata)``. Returns dict keyed by ``tier`` for O(1) lookups and a ``loading`` boolean.
* **app/admin/members/page.tsx** –
  * Delete local ``tierConfig`` constant.
  * ``const { data: tierConfig, loading } = useTierConfig();``
  * Gate render sections that need prices until ``!loading``.
* **components/admin/member-card.tsx**
* **components/admin/member-details-modal.tsx**
* **components/admin/member-status-filter.tsx**
  * Replace ``import { tierConfig }`` with ``useTierConfig()``.
  * Where only label/color needed, compute ``tierConfig[tier].name`` and apply ``style={{ backgroundColor: meta.colors.bg, color: meta.colors.text, borderColor: meta.colors.border }}``.
* **components/icons/tier-badge.tsx** – fetch name / price / colors and use gold palette.

Summary of changes
* All UI components now source **both metadata and color palette** from server, eliminating duplicated constants on client.

Unit tests
* Update affected component tests to mock ``useTierConfig`` hook instead of static import.
* Add happy-path render tests ensuring tiers labels show correctly.

Phase 3 – Cleanup & deprecations
--------------------------------
Affected files
* **lib/admin-config.ts** – remove ``tierConfig`` export and any color constants; keep status & payment config.
* All files still importing ``tierConfig`` after phase 2 – remove / update.
* Delete redundant unit tests touching removed constant.

Summary of changes
* Ensures single source of truth for tier metadata.
* Removes possibility of stale price values in client bundle.

Unit tests
* CI passes with no references to removed constant or color classes. 