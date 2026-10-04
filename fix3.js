const fs = require('fs');
let skills = fs.readFileSync('app/(app)/skills/page.tsx', 'utf8');
skills = skills.replace(/const INITIAL_SKILLS: SkillNode\[\] = \[[\s\S]*?\];/s, 'const INITIAL_SKILLS: SkillNode[] = [];');
skills = skills.replace(/const INITIAL_TAGS = \[[\s\S]*?\];/s, 'const INITIAL_TAGS: any[] = [];');

skills = skills.replace('{filteredSkills.map((skill) => {', '{filteredSkills.length === 0 ? (\n              <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--sf-bg-surface)", borderRadius: "12px", border: "1px solid var(--sf-border-subtle)" }}>\n                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎯</div>\n                <h3 style={{ margin: "0 0 6px 0", color: "var(--sf-text-primary)" }}>No skills found</h3>\n                <p style={{ margin: 0, color: "var(--sf-text-secondary)", fontSize: "0.875rem" }}>You have not added any skills yet.</p>\n              </div>\n            ) : (\n              filteredSkills.map((skill) => {');

skills = skills.replace('                </div>\n              );\n            })}\n          </div>', '                </div>\n              );\n            })\n          )}\n          </div>');

skills = skills.replace('{/* Right Column: Node Inspector */}\n          <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">', '{/* Right Column: Node Inspector */}\n        {selectedSkill ? (\n          <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">');

skills = skills.replace('          </aside>\n      </div>\n\n      {/* Bottom Section: Taxonomy & Labels Manager */}', '          </aside>\n        ) : (\n          <aside className={styles.inspectorPane}>\n            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--sf-text-muted)" }}>\n              Select or create a skill node to view telemetry.\n            </div>\n          </aside>\n        )}\n      </div>\n\n      {/* Bottom Section: Taxonomy & Labels Manager */}');

fs.writeFileSync('app/(app)/skills/page.tsx', skills);
