# Privacy Policy for SmoothBoost

**Effective Date:** November 26, 2026  
**Last Updated:** November 26, 2026  

SmoothBoost is committed to protecting your privacy. This Privacy Policy explains our practices regarding user information and data handling across all distributions of SmoothBoost, including the Firefox Add-on, Chrome/Edge extension, Safari extension, and Userscript editions.

---

### 1. Zero Data Collection

SmoothBoost does **NOT** collect, store, transmit, or share any personal information, browsing activity, or telemetry:

- **No Personal Information:** We do not collect names, email addresses, IP addresses, device identifiers, or account information.
- **No Browsing History:** SmoothBoost does not record, log, or monitor the URLs you visit, the content of web pages, or your search queries.
- **No Keystroke or Form Logging:** SmoothBoost never reads or intercepts password fields, payment forms, or user input.
- **No Analytics or Trackers:** SmoothBoost contains zero analytics SDKs, zero telemetry trackers, and zero third-party tracking scripts (such as Google Analytics or Sentry).

---

### 2. Local Execution and Data Storage

All performance analysis, scroll optimizations, resource deferrals, and frame pacing operate **entirely locally on your device**:

- **Local Storage (`browser.storage.local` / `GM_setValue`):** SmoothBoost stores user preferences (such as selected optimization profile, custom toggle states, target FPS limits, and user-specified per-site exemptions) exclusively on your local machine.
- This data never leaves your computer or browser and is never uploaded to any remote server or third party.
- You can clear your stored preferences at any time by uninstalling the extension or resetting settings in the popup.

---

### 3. Permissions Justification

SmoothBoost requests only the minimal browser permissions necessary to execute its local performance heuristics:

- **`storage`**: Used exclusively to persist your configuration settings and per-site rules locally.
- **`activeTab` / `scripting`**: Used to apply client-side performance scripts (e.g., passive scroll listeners, offscreen embed deferrals) to the active page you view.
- **`alarms`**: Used to pace periodic idle tab management and performance checks.
- **`declarativeNetRequest`**: Used strictly to apply a local, non-blocking stylesheet query parameter (`display=swap`) for `fonts.googleapis.com` web fonts without reading or intercepting your browsing traffic.

---

### 4. Third-Party Websites

SmoothBoost operates on websites you visit to optimize their rendering performance. This Privacy Policy applies strictly to the SmoothBoost extension itself and does not govern the privacy practices of external third-party websites you browse.

---

### 5. Policy Updates and Inquiries

If this Privacy Policy is updated, changes will be published in this document and documented in the project's changelog.

If you have questions, feedback, or security concerns regarding this policy, please open an issue on our GitHub repository:  
**Issue Tracker:** [https://github.com/BiniFn/SmoothBoost/issues](https://github.com/BiniFn/SmoothBoost/issues)  
**Project Repository:** [https://github.com/BiniFn/SmoothBoost](https://github.com/BiniFn/SmoothBoost)  
