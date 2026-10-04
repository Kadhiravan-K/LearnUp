const fs = require('fs');
let lines = fs.readFileSync('app/(app)/skills/page.tsx', 'utf8').split(/\r?\n/);

let idx1 = lines.findIndex(l => l.includes('{/* Right Column: Node Inspector */}'));
if(idx1 !== -1) {
  lines[idx1] = '{/* Right Column: Node Inspector */}\n        {selectedSkill ? (';
}

let idx2 = lines.findIndex(l => l.includes('{/* Bottom Section: Taxonomy & Labels Manager */}'));
if(idx2 !== -1) {
  // First, we need to remove the "      </div>\n" that precedes idx2
  if (lines[idx2 - 1].trim() === '</div>' && lines[idx2 - 2].trim() === '</div>') {
      // Remove one of them because we will re-add it.
      lines[idx2 - 1] = '';
  }
  lines[idx2] = '        ) : (\n          <aside className={styles.inspectorPane}>\n            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--sf-text-muted)" }}>\n              Select or create a skill node to view telemetry.\n            </div>\n          </aside>\n        )}\n      </div>\n\n      {/* Bottom Section: Taxonomy & Labels Manager */}';
}

fs.writeFileSync('app/(app)/skills/page.tsx', lines.join('\n'));
