# Builder quick tour

`<BuilderTutorial />` opens a four-step native modal dialog on the first visit. The app already mounts it beside MissionBuilder. It teaches orbit, resource bars, blocking issues and launch without changing simulation state.

Focus moves to the heading on open. Tab and Shift+Tab wrap through the enabled buttons; the browser makes the builder inert behind the dialog. Escape, Skip tips and Got it close it. Focus returns to the previous connected control, or to the permanent Builder tips button if entry came from a removed screen/body. That button can reopen the tour at step one without clearing any stored game data.

Completion or skip is saved under `space-apps-2026:builder-tips:v1`. Storage failures cannot block dismissal but can make it appear again after remount. Existing dismissal preferences remain valid.

Optional `onShowStep(id)` receives `orbit | budgets | issues | launch`. The Show me in builder button closes/skips the tour first, then invokes the callback so the owner can focus its own section. Without the callback that button is absent. Source does not query another owner's DOM.

Preview: `/ui/tutorial/preview.html`. Its Replay control resets only the tutorial preference so first-visit behavior can be checked. Shared theme must be loaded once by the app. Dialog is responsive, scrolls within short viewports, and has no animation.
