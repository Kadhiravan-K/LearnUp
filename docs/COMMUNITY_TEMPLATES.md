# Community Templates in LearnUp

LearnUp includes a curated set of built-in community learning templates designed to help users quickly kickstart structured study paths across various disciplines (Computer Science, Mathematics, Machine Learning, Language Learning, System Design, etc.).

---

## Architecture & Isolation

1. **Static Predefined Templates**:
   - Community templates are defined as static immutable blueprints in `lib/templates/`.
   - They do **not** insert or pollute the database with mock user records upon fresh installation.
   - Users browse available templates via the `/templates` gallery interface.

2. **Instantiation / Cloning Flow**:
   - When a user selects **"Use Template"**, LearnUp clones the template structure (course outline, playlist references, milestone structure) into the authenticated user's private library.
   - The instantiated copy receives a fresh unique `id`, assigned `user_id = auth.uid()`, and zero initial progress.
   - Changes made by the user to their cloned copy remain completely isolated to their private account via Row-Level Security (RLS).

---

## Contributing a Community Template

Community contributions of new learning templates are welcome! To contribute a template:

1. Create a structured template definition following the schema in `lib/types/template.ts`.
2. Include:
   - `id`: kebab-case unique identifier.
   - `title`: Descriptive course/study name.
   - `description`: Clear educational overview.
   - `category`: Relevant academic or professional domain.
   - `modules`: List of structured topics with valid educational YouTube video/playlist sources.
   - `tags`: Discoverability tags.
3. Add your template to the template registry in `lib/templates/index.ts`.
4. Run unit tests (`npm test -- --run`) to verify schema and structural integrity.
