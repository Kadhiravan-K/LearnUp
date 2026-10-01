import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Profile Chooser & Authentication Entry Screen Tests", () => {
  const root = path.resolve(__dirname, "../..");

  it("verifies AuthLayout does not artificially constrain desktop viewport width to 400px", () => {
    const layoutPath = path.join(root, "app/(auth)/layout.tsx");
    const layoutCssPath = path.join(root, "app/(auth)/AuthLayout.module.css");

    const layoutContent = fs.readFileSync(layoutPath, "utf8");
    const layoutCssContent = fs.readFileSync(layoutCssPath, "utf8");

    // Layout should render container directly without inner fixed-width cardWrapper
    expect(layoutContent).not.toContain("cardWrapper");
    expect(layoutCssContent).not.toMatch(/max-width:\s*400px/);
    expect(layoutCssContent).toContain("min-height: 100vh");
    expect(layoutCssContent).toContain("justify-content: center");
  });

  it("verifies ProfileChooser has responsive max-width container and flex/grid layout", () => {
    const chooserCssPath = path.join(
      root,
      "components/auth/ProfileChooser.module.css",
    );
    const chooserCss = fs.readFileSync(chooserCssPath, "utf8");

    // Container should use generous max-width (>= 900px)
    expect(chooserCss).toMatch(/max-width:\s*960px/);

    // Profiles grid should be flexible and centered
    expect(chooserCss).toContain("display: flex");
    expect(chooserCss).toContain("flex-wrap: wrap");
    expect(chooserCss).toContain("justify-content: center");

    // Profile card should have comfortable desktop dimensions
    expect(chooserCss).toMatch(/width:\s*200px/);
    expect(chooserCss).toMatch(/min-height:\s*230px/);
  });

  it("verifies ProfileChooser branding, heading, and minimal clean UX", () => {
    const chooserPath = path.join(root, "components/auth/ProfileChooser.tsx");
    const content = fs.readFileSync(chooserPath, "utf8");

    // Heading should be "Who's learning today?"
    expect(content).toContain("Who&apos;s learning today?");
    expect(content).toContain(
      "Select your profile to continue learning, or add a new account.",
    );
    expect(content).toContain("Add profile");

    // Unnecessary startup UI must be absent
    expect(content).not.toContain("Show on startup");
    expect(content).not.toContain("showOnStartup");
    expect(content).not.toContain("guestDisclaimer");
    expect(content).not.toContain("showGuestInfo");
  });

  it("verifies ProfileChooser supports Light and Dark theme toggling", () => {
    const chooserPath = path.join(root, "components/auth/ProfileChooser.tsx");
    const chooserCssPath = path.join(
      root,
      "components/auth/ProfileChooser.module.css",
    );

    const content = fs.readFileSync(chooserPath, "utf8");
    const css = fs.readFileSync(chooserCssPath, "utf8");

    expect(content).toContain("useLearnUpTheme");
    expect(content).toContain("toggleTheme");
    expect(content).toContain("isDark");
    expect(content).toContain("aria-label");

    // CSS must define dark mode overrides for cards
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("--sf-color-surface");
    expect(css).toContain("--sf-color-border");
  });

  it("verifies LoginForm and SignupForm render in self-contained centered cards", () => {
    const loginFormPath = path.join(root, "components/auth/LoginForm.tsx");
    const signupFormPath = path.join(root, "components/auth/SignupForm.tsx");
    const loginCssPath = path.join(
      root,
      "components/auth/LoginForm.module.css",
    );
    const signupCssPath = path.join(
      root,
      "components/auth/SignupForm.module.css",
    );

    expect(fs.readFileSync(loginFormPath, "utf8")).toContain("styles.card");
    expect(fs.readFileSync(signupFormPath, "utf8")).toContain("styles.card");
    expect(fs.readFileSync(loginCssPath, "utf8")).toContain(".card");
    expect(fs.readFileSync(signupCssPath, "utf8")).toContain(".card");
  });
});
