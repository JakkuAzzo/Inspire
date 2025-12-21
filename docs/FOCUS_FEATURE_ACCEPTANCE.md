# Focus interactions acceptance criteria

This document defines the expected behavior for three related focus features: combined focus drag-and-drop, the creator settings modal, and the focus animation controls. Each section includes acceptance criteria the UI and QA teams can reference.

## Combined focus drag-and-drop

### Behavior
- Pack cards can be dragged into the combined focus mixer/drop area from the pack deck.
- The drop zone highlights on drag-over and announces the current number of added cards.
- Keyboard users can focus the drop area and press **Enter** or **Space** to add the currently expanded card.
- The mixer area exposes a clear action that removes all combined cards and announces the change.
- Analytics events should fire for drag-over, drop, keyboard add, and clear interactions.

### Acceptance criteria
1. When a card is dragged over the drop zone, the zone gains a hover state and an `aria-label` identifying it as the combined focus drop area.
2. Dropping a valid pack card updates the helper text to show the incremented count (e.g., “1 added”).
3. Pressing Enter/Space while the drop zone is focused adds the currently expanded card when one exists.
4. The Clear control empties the combined focus list and resets the helper text to the default prompt.
5. Each drag-over, drop, keyboard add, and clear action is logged via the analytics utility.

## Creator settings modal

### Behavior
- The modal opens from the top nav settings control and is keyboard navigable.
- Collaboration mode toggles (“Go Live”, “Collaborate”) behave as pill switches and persist across reloads.
- Viewer modes expose a contextual “Leave” action when spectating or joining a room.
- Auto-refresh cadence chips mirror the in-card timer controls and persist between sessions.
- Analytics events are emitted when collaboration or auto-refresh settings change.

### Acceptance criteria
1. Opening the modal surfaces a live status label that updates when collaboration/viewer modes change.
2. Toggling collaboration mode updates the pressed state and stores the selection for future loads.
3. The Leave action is keyboard-activatable and returns the user to “Solo Session”.
4. Selecting an auto-refresh cadence activates the chip, saves the value, and the choice is restored after a reload.
5. All toggles and chips expose tooltips or descriptive text clarifying their purpose.

## Focus animation mode

### Behavior
- The focus animation settings are available via the “Focus animation mode” control in the nav.
- Density (visible items) and speed sliders include helper text and screen reader descriptions.
- Changes persist to local storage so users return to their prior animation feel.
- Analytics events capture adjustments to density and speed.

### Acceptance criteria
1. Opening the focus animation modal reveals labeled sliders for “Visible items” and “Speed” with associated hint text.
2. Adjusting either slider updates the live value text and stores the selection; reloading the page preserves the values.
3. Sliders expose `aria-describedby` to connect hints for accessibility.
4. An analytics event is emitted when either slider changes.
5. The preview area remains visible (when provided) to illustrate the effect of the chosen settings.
