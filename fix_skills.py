import re

with open('app/(app)/skills/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace INITIAL_SKILLS
content = re.sub(
    r'const INITIAL_SKILLS: SkillNode\[\] = \[.*?\];',
    'const INITIAL_SKILLS: SkillNode[] = [];',
    content,
    flags=re.DOTALL
)

# Replace INITIAL_TAGS
content = re.sub(
    r'const INITIAL_TAGS = \[.*?\];',
    'const INITIAL_TAGS: any[] = [];',
    content,
    flags=re.DOTALL
)

# Replace the start of map
content = content.replace(
    '{filteredSkills.map((skill) => {',
    '''{filteredSkills.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--sf-bg-surface)", borderRadius: "12px", border: "1px solid var(--sf-border-subtle)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎯</div>
                <h3 style={{ margin: "0 0 6px 0", color: "var(--sf-text-primary)" }}>No skills found</h3>
                <p style={{ margin: 0, color: "var(--sf-text-secondary)", fontSize: "0.875rem" }}>You have not added any skills yet.</p>
              </div>
            ) : (
              filteredSkills.map((skill) => {'''
)

# Replace the end of map
content = content.replace(
    '''              );
            })}
          </div>''',
    '''              );
            })
          )}
          </div>'''
)

# Replace the start of inspector pane
content = content.replace(
    '''        {/* Right Column: Node Inspector */}
        <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">''',
    '''        {/* Right Column: Node Inspector */}
        {selectedSkill ? (
          <aside className={styles.inspectorPane} aria-label="Skill Node Inspector">'''
)

# Replace the end of inspector pane
content = content.replace(
    '''          </div>
        </aside>
      </div>

      {/* Bottom Section: Taxonomy & Labels Manager */}''',
    '''          </div>
          </aside>
        ) : (
          <aside className={styles.inspectorPane}>
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--sf-text-muted)" }}>
              Select or create a skill node to view telemetry.
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Section: Taxonomy & Labels Manager */}'''
)

with open('app/(app)/skills/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
