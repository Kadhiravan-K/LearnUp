# Security Policy

LearnUp takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

---

## Supported Versions

Only the latest release and the current `main` branch are actively supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| >= 0.1.0 | :white_check_mark: |
| < 0.1.0  | :x:                |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues or discussions.**

Instead, please report security issues using GitHub's **Private Vulnerability Reporting**:
1. Navigate to the **Security** tab of the LearnUp repository.
2. Select **Advisories** and click **Report a vulnerability**.
3. Provide detailed steps to reproduce the issue, potential impact, and proposed remediations if available.

If private vulnerability reporting is unavailable, you can contact the project maintainers directly via repository management.

---

## Response Process

- **Acknowledgment**: We aim to acknowledge receipt of security reports within 48 hours.
- **Assessment**: The maintainers will investigate and assess the impact and severity.
- **Fix & Release**: A security patch will be prepared, verified, and released as a priority update.
- **Disclosure**: A public advisory will be published once the patch has been deployed and verified.

---

## Security Invariants in LearnUp

- **Row-Level Security (RLS)**: Enforced on all user-scoped data tables with zero client-side bypass.
- **No Secret Leaks**: Client bundles never contain server secrets, service role keys, or sensitive third-party credentials.
- **Safe Embeds & Isolation**: Third-party embeds (such as YouTube player) operate inside isolated iframes without proxying media bytes or injecting privileged scripts.
