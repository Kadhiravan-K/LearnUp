const fs = require('fs');
let skills = fs.readFileSync('app/(app)/skills/page.tsx', 'utf8');
skills = skills.replace('{/* Right Column: Node Inspector */}\n          <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">', '{/* Right Column: Node Inspector */}\n        {selectedSkill ? (\n          <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">');
skills = skills.replace('          </aside>\n      </div>\n\n      {/* Bottom Section: Taxonomy & Labels Manager */}', '          </aside>\n        ) : (\n          <aside className={styles.inspectorPane}>\n            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--sf-text-muted)" }}>\n              Select or create a skill node to view telemetry.\n            </div>\n          </aside>\n        )}\n      </div>\n\n      {/* Bottom Section: Taxonomy & Labels Manager */}');
fs.writeFileSync('app/(app)/skills/page.tsx', skills);
